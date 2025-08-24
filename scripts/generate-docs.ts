/*
  Generator: Builds docs/field-map.json, docs/field-map-slim.json, docs/supabase-storage-map.json and updates docs/*.md
  Approach: Parse step components with ts-morph, detect Zod schemas and Supabase ops, and synthesize maps.
  Scope: Property steps currently implemented. Heuristic-based but resilient to common patterns in this repo.
*/
import { Project, SyntaxKind, Node, CallExpression, ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import { globby } from 'globby';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

type ZField = { type: string };
type ZObject = Record<string, ZField>;

type TableOp = {
  type: 'table';
  table: string;
  op: 'deleteInsert' | 'insert' | 'upsert';
  rowShape?: Record<string, string>;
  deleteWhere?: string[];
  insertAugment?: Record<string, string>;
  notes?: string;
};
type BlobOp = {
  type: 'sheet_blobs';
  table: 'sheet_blobs';
  op: 'upsert';
  key: string[];
  payloadShape?: Record<string, any>;
  notes?: string;
};

type TabInfo = {
  tabKey: string;
  sheetName: string;
  autosave?: { strategy: string; ms?: number };
  operations: Array<TableOp | BlobOp>;
};

const ROOT = process.cwd();
const DOCS = join(ROOT, 'docs');

function ensureDocsDir() {
  if (!existsSync(DOCS)) mkdirSync(DOCS, { recursive: true });
}

function literalToString(node: Node): string | undefined {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralText();
  return undefined;
}

function detectSheetNameFromUpsert(call: CallExpression): string | undefined {
  // Look for .eq('sheet_name', '...') or payload sheet_name literal in upsert arg
  const parentStmt = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
  if (!parentStmt) return undefined;
  const text = parentStmt.getText();
  const m = text.match(/sheet_name\s*[:=]\s*['"]([^'"]+)['"]/);
  if (m) return m[1];
  const eqm = text.match(/\.eq\(\s*['"]sheet_name['"],\s*['"]([^'"]+)['"]\s*\)/);
  if (eqm) return eqm[1];
  return undefined;
}

function detectTableName(call: CallExpression): string | undefined {
  const text = call.getExpression().getText();
  // supabase.from('table')...
  const full = call.getText();
  const m = full.match(/\.from\(\s*['"]([^'"]+)['"]\s*\)/);
  return m?.[1];
}

function readZodObjectShape(obj: ObjectLiteralExpression): ZObject {
  const out: ZObject = {};
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const name = prop.getName().replace(/['"]/g, '');
    const init = (prop as PropertyAssignment).getInitializer();
    let type = 'unknown';
    if (init && Node.isCallExpression(init)) {
      const chain = init.getText();
      if (/z\.string\(\)/.test(chain)) type = 'string';
      if (/z\.number\(\)/.test(chain)) type = 'number';
      if (/z\.boolean\(\)/.test(chain)) type = 'boolean';
      if (/optional\(\)/.test(chain) || /\.optional\(/.test(chain) || /\.optional\(\)/.test(chain) || /\.or\(z\.literal\(''\)\)/.test(chain)) type += '?';
    }
    out[name] = { type };
  }
  return out;
}

function firstObjectArgFromZObject(call: CallExpression): ObjectLiteralExpression | undefined {
  const args = call.getArguments();
  if (args.length && Node.isObjectLiteralExpression(args[0])) return args[0];
  return undefined;
}

async function main() {
  ensureDocsDir();
  const project = new Project({ tsConfigFilePath: join(ROOT, 'tsconfig.json') });
  const files = await globby(['src/pages/wizard/steps/**/*.tsx'], { cwd: ROOT, absolute: true });
  files.forEach(f => project.addSourceFileAtPath(f));

  const tabs: TabInfo[] = [];

  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath();
    // Identify sheet name via sheet_blobs usage or filename heuristics
    let sheetName: string | undefined;
    let tabKey: string | undefined;
    if (/StepHeader\.tsx$/.test(filePath)) { sheetName = 'Header'; tabKey = 'header'; }
    if (/StepEpiSummary\.tsx$/.test(filePath)) { sheetName = 'EPI Summary'; tabKey = 'epi-summary'; }
    if (/StepTreatyStatsProp\.tsx$/.test(filePath)) { sheetName = 'Treaty Statistics_Prop'; tabKey = 'treaty-stats-prop'; }
    if (/StepTreatyStatsNonProp\.tsx$/.test(filePath)) { sheetName = 'Treaty Statistics_Non-Prop'; tabKey = 'treaty-stats-non-prop'; }
    if (/StepLargeLossList\.tsx$/.test(filePath)) { sheetName = 'Large Loss List'; tabKey = 'large-loss-list'; }

    const operations: Array<TableOp | BlobOp> = [];

    // Collect zod object schemas
    const zodObjects = new Map<string, ZObject>();
    sf.forEachDescendant(node => {
      if (Node.isCallExpression(node)) {
        const exprText = node.getExpression().getText();
        if (/z\.object\(/.test(exprText)) {
          const objArg = firstObjectArgFromZObject(node);
          if (objArg) {
            const parentDecl = node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
            const name = parentDecl?.getName() ?? `anon_${zodObjects.size}`;
            zodObjects.set(name, readZodObjectShape(objArg));
          }
        }
      }
    });

    // Detect Supabase calls
    sf.forEachDescendant(node => {
      if (!Node.isCallExpression(node)) return;
      const text = node.getText();
      if (/\.from\(.*\)\.delete\(\)/.test(text)) {
        const table = detectTableName(node) || 'unknown';
        operations.push({
          type: 'table', table, op: 'deleteInsert', deleteWhere: ['submission_id = :submissionId'], insertAugment: { submission_id: ':submissionId' }
        });
      }
      if (/\.from\(.*\)\.insert\(/.test(text)) {
        const table = detectTableName(node) || 'unknown';
        // try to bind row shape from any RowSchema or obvious object literal
        let rowShape: Record<string, string> | undefined;
        const rowSchema = Array.from(zodObjects.entries()).find(([k]) => /RowSchema/i.test(k));
        if (rowSchema) {
          rowShape = Object.fromEntries(Object.entries(rowSchema[1]).map(([k, v]) => [k, v.type]));
        }
        operations.push({ type: 'table', table, op: 'insert', rowShape });
      }
      if (/\.from\(.*\)\.upsert\(/.test(text)) {
        const table = detectTableName(node) || 'unknown';
        if (table === 'sheet_blobs') {
          const sheet = detectSheetNameFromUpsert(node) || sheetName || 'Unknown';
          // try to infer payload keys
          let payloadShape: Record<string, any> | undefined;
          const upsertArg = node.getArguments()[0];
          if (upsertArg && Node.isArrayLiteralExpression(upsertArg)) {
            const first = upsertArg.getElements()[0];
            if (first && Node.isObjectLiteralExpression(first)) {
              const payloadProp = first.getProperty('payload') as PropertyAssignment | undefined;
              const init = payloadProp?.getInitializer();
              if (init && Node.isObjectLiteralExpression(init)) {
                payloadShape = {};
                init.getProperties().forEach(p => {
                  if (Node.isPropertyAssignment(p)) {
                    const key = p.getName().replace(/['"]/g, '');
                    payloadShape![key] = 'unknown';
                  }
                });
              } else if (zodObjects.has('FormSchema')) {
                payloadShape = Object.fromEntries(Object.entries(zodObjects.get('FormSchema')!).map(([k,v]) => [k, v.type]));
              }
            }
          }
          operations.push({ type: 'sheet_blobs', table: 'sheet_blobs', op: 'upsert', key: ['submission_id','sheet_name'], payloadShape, notes: sheet });
        }
      }
    });

    if (operations.length) {
      tabs.push({ tabKey: tabKey || sf.getBaseNameWithoutExtension().toLowerCase(), sheetName: sheetName || 'Unknown', autosave: { strategy: 'debounced' }, operations });
    }
  }

  // Synthesize field-map.json-like view
  const fieldMap = {
    lob: 'property',
    tabs: tabs.map(t => ({
      tabKey: t.tabKey,
      sheetName: t.sheetName,
      storage: t.operations.map(op => op.type === 'table'
        ? { type: 'table', table: op.table, rowSchema: op.rowShape ?? {} }
        : { type: 'sheet_blobs', table: 'sheet_blobs', key: ['submission_id','sheet_name'], payloadSchema: (op as BlobOp).payloadShape ?? {} })
    }))
  };

  // Slim map for n8n
  const slim = {
    lob: 'property',
    tabs: tabs.map(t => {
      const excelColumns: any = {};
      for (const op of t.operations) {
        if (op.type === 'table') {
          if (op.rowShape && Object.keys(op.rowShape).length) {
            excelColumns[`table:${op.table}`] = Object.keys(op.rowShape).map(h => h.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
          }
        } else {
          excelColumns['sheet_blobs'] = { fields: (op.payloadShape ? Object.keys(op.payloadShape) : []).reduce((acc: any, k) => ({ ...acc, [k]: k.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase()) }), {}) };
        }
      }
      return { tabKey: t.tabKey, sheetName: t.sheetName, excelColumns };
    })
  };

  // Storage map
  const storage = {
    lob: 'Property',
    generatedAt: new Date().toISOString(),
    tabs
  };

  // Write files
  writeFileSync(join(DOCS, 'field-map.generated.json'), JSON.stringify(fieldMap, null, 2));
  writeFileSync(join(DOCS, 'field-map-slim.generated.json'), JSON.stringify(slim, null, 2));
  writeFileSync(join(DOCS, 'supabase-storage-map.generated.json'), JSON.stringify(storage, null, 2));

  // Minimal MD note
  const md = `# Generated Docs\n\nThis folder contains generated files based on parsing step components.\n\n- field-map.generated.json\n- field-map-slim.generated.json\n- supabase-storage-map.generated.json\n\nRegenerate with: npm run generate:docs\n`;
  writeFileSync(join(DOCS, 'GENERATED.md'), md);

  // Done
  // eslint-disable-next-line no-console
  console.log('Docs generated in docs/*.generated.json');
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

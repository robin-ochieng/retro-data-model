// CommonJS generator to avoid ESM/tsx issues on some Node versions
const { Project, SyntaxKind, Node } = require('ts-morph');
const fg = require('fast-glob');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const ROOT = process.cwd();
const DOCS = join(ROOT, 'docs');

function ensureDocsDir() { if (!existsSync(DOCS)) mkdirSync(DOCS, { recursive: true }); }

function readZodObjectShape(obj) {
  const out = {};
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const name = prop.getName().replace(/['"]/g, '');
    const init = prop.getInitializer();
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

function firstObjectArgFromZObject(call) {
  const args = call.getArguments();
  if (args.length && Node.isObjectLiteralExpression(args[0])) return args[0];
  return undefined;
}

function detectTableName(call) {
  const full = call.getText();
  const m = full.match(/\.from\(\s*['"]([^'"]+)['"]\s*\)/);
  return (m && m[1]) || undefined;
}

function detectSheetNameFromUpsert(call) {
  const parentStmt = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
  if (!parentStmt) return undefined;
  const text = parentStmt.getText();
  const m = text.match(/sheet_name\s*[:=]\s*['"]([^'"]+)['"]/);
  if (m) return m[1];
  const eqm = text.match(/\.eq\(\s*['"]sheet_name['"],\s*['"]([^'"]+)['"]\s*\)/);
  if (eqm) return eqm[1];
  return undefined;
}

async function main() {
  ensureDocsDir();
  const project = new Project({ tsConfigFilePath: join(ROOT, 'tsconfig.json') });
  const files = await fg(['src/pages/wizard/steps/**/*.tsx'], { cwd: ROOT, absolute: true });
  files.forEach(f => project.addSourceFileAtPath(f));

  const tabs = [];

  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath();
    let sheetName; let tabKey;
    if (/StepHeader\.tsx$/.test(filePath)) { sheetName = 'Header'; tabKey = 'header'; }
    if (/StepEpiSummary\.tsx$/.test(filePath)) { sheetName = 'EPI Summary'; tabKey = 'epi-summary'; }
    if (/StepTreatyStatsProp\.tsx$/.test(filePath)) { sheetName = 'Treaty Statistics_Prop'; tabKey = 'treaty-stats-prop'; }
    if (/StepTreatyStatsNonProp\.tsx$/.test(filePath)) { sheetName = 'Treaty Statistics_Non-Prop'; tabKey = 'treaty-stats-non-prop'; }
    if (/StepLargeLossList\.tsx$/.test(filePath)) { sheetName = 'Large Loss List'; tabKey = 'large-loss-list'; }

    const operations = [];
    const zodObjects = new Map();

    sf.forEachDescendant(node => {
      if (Node.isCallExpression(node)) {
        const exprText = node.getExpression().getText();
        if (/z\.object\(/.test(exprText)) {
          const objArg = firstObjectArgFromZObject(node);
          if (objArg) {
            const parentDecl = node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
            const name = (parentDecl && parentDecl.getName()) || `anon_${zodObjects.size}`;
            zodObjects.set(name, readZodObjectShape(objArg));
          }
        }
      }
    });

    sf.forEachDescendant(node => {
      if (!Node.isCallExpression(node)) return;
      const text = node.getText();
      if (/\.from\(.*\)\.delete\(\)/.test(text)) {
        const table = detectTableName(node) || 'unknown';
        operations.push({ type: 'table', table, op: 'deleteInsert', deleteWhere: ['submission_id = :submissionId'], insertAugment: { submission_id: ':submissionId' } });
      }
      if (/\.from\(.*\)\.insert\(/.test(text)) {
        const table = detectTableName(node) || 'unknown';
        let rowShape;
        const rowSchema = Array.from(zodObjects.entries()).find(([k]) => /RowSchema/i.test(k));
        if (rowSchema) rowShape = Object.fromEntries(Object.entries(rowSchema[1]).map(([k, v]) => [k, v.type]));
        operations.push({ type: 'table', table, op: 'insert', rowShape });
      }
      if (/\.from\(.*\)\.upsert\(/.test(text)) {
        const table = detectTableName(node) || 'unknown';
        if (table === 'sheet_blobs') {
          const sheet = detectSheetNameFromUpsert(node) || sheetName || 'Unknown';
          let payloadShape;
          const upsertArg = node.getArguments()[0];
          if (upsertArg && Node.isArrayLiteralExpression(upsertArg)) {
            const first = upsertArg.getElements()[0];
            if (first && Node.isObjectLiteralExpression(first)) {
              const payloadProp = first.getProperty('payload');
              const init = payloadProp && payloadProp.getInitializer();
              if (init && Node.isObjectLiteralExpression(init)) {
                payloadShape = {};
                init.getProperties().forEach(p => {
                  if (Node.isPropertyAssignment(p)) {
                    const key = p.getName().replace(/['"]/g, '');
                    payloadShape[key] = 'unknown';
                  }
                });
              } else if (zodObjects.has('FormSchema')) {
                const f = zodObjects.get('FormSchema');
                payloadShape = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.type]));
              }
            }
          }
      operations.push({ type: 'sheet_blobs', table: 'sheet_blobs', op: 'upsert', key: ['submission_id','sheet_name'], payloadShape, notes: sheet });
      // If we didn't resolve sheetName earlier, set it from detected sheet
      if (!sheetName && sheet) sheetName = sheet;
        }
      }
    });

    if (operations.length) {
  tabs.push({ tabKey: tabKey || sf.getBaseNameWithoutExtension().toLowerCase(), sheetName: sheetName || (operations.find(o => o.type === 'sheet_blobs')?.notes) || 'Unknown', autosave: { strategy: 'debounced' }, operations });
    }
  }

  const fieldMap = {
    lob: 'property',
    tabs: tabs.map(t => ({
      tabKey: t.tabKey,
      sheetName: t.sheetName,
      storage: t.operations.map(op => op.type === 'table'
        ? { type: 'table', table: op.table, rowSchema: op.rowShape || {} }
        : { type: 'sheet_blobs', table: 'sheet_blobs', key: ['submission_id','sheet_name'], payloadSchema: op.payloadShape || {} })
    }))
  };

  const slim = {
    lob: 'property',
    tabs: tabs.map(t => {
      const excelColumns = {};
      for (const op of t.operations) {
        if (op.type === 'table') {
          if (op.rowShape && Object.keys(op.rowShape).length) {
            excelColumns[`table:${op.table}`] = Object.keys(op.rowShape).map(h => h.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
          }
        } else {
          const fields = {};
          const keys = op.payloadShape ? Object.keys(op.payloadShape) : [];
          for (const k of keys) fields[k] = k.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());
          excelColumns['sheet_blobs'] = { fields };
        }
      }
      return { tabKey: t.tabKey, sheetName: t.sheetName, excelColumns };
    })
  };

  const storage = { lob: 'Property', generatedAt: new Date().toISOString(), tabs };

  writeFileSync(join(DOCS, 'field-map.generated.json'), JSON.stringify(fieldMap, null, 2));
  writeFileSync(join(DOCS, 'field-map-slim.generated.json'), JSON.stringify(slim, null, 2));
  writeFileSync(join(DOCS, 'supabase-storage-map.generated.json'), JSON.stringify(storage, null, 2));
  // Also mirror into the non-generated JSONs for external consumers
  writeFileSync(join(DOCS, 'field-map.json'), JSON.stringify(fieldMap, null, 2));
  writeFileSync(join(DOCS, 'field-map-slim.json'), JSON.stringify(slim, null, 2));
  writeFileSync(join(DOCS, 'supabase-storage-map.json'), JSON.stringify(storage, null, 2));
  const mdGenerated = `# Generated Docs\n\nThis folder contains generated files based on parsing step components.\n\n- field-map.generated.json\n- field-map-slim.generated.json\n- supabase-storage-map.generated.json\n\nRegenerate with: npm run generate:docs\n`;
  writeFileSync(join(DOCS, 'GENERATED.md'), mdGenerated);

  // Human-readable Markdown summaries
  const fieldMapMd = [
    '# Field Map',
    '',
    'This document summarizes the tabs, their sheet names, and storage shapes inferred from the codebase.',
    '',
    '## Tabs',
    '',
    ...tabs.map(t => `- ${t.tabKey} — sheet: ${t.sheetName}`),
    '',
    '## Storage',
    '',
    ...tabs.flatMap(t => {
      const lines = [`### ${t.tabKey} (${t.sheetName})`, ''];
      for (const op of t.operations) {
        if (op.type === 'table') {
          const keys = op.rowShape ? Object.keys(op.rowShape) : [];
          lines.push(`- table: ${op.table} (${op.op})${keys.length ? ` — fields: ${keys.join(', ')}` : ''}`);
        } else {
          const keys = op.payloadShape ? Object.keys(op.payloadShape) : [];
          lines.push(`- sheet_blobs upsert — key: [submission_id, sheet_name]${keys.length ? ` — payload: ${keys.join(', ')}` : ''}${op.notes ? ` — sheet_name: ${op.notes}` : ''}`);
        }
      }
      lines.push('');
      return lines;
    })
  ].join('\n');
  writeFileSync(join(DOCS, 'field-map.md'), fieldMapMd);

  const storageMd = [
    '# Supabase Storage Map',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    ...tabs.map(t => {
      const ops = t.operations.map(op => op.type === 'table' ? `table:${op.table}:${op.op}` : 'sheet_blobs:upsert').join(', ');
      return `- ${t.tabKey} (${t.sheetName}) — ${ops}`;
    })
  ].join('\n');
  writeFileSync(join(DOCS, 'supabase-storage-map.md'), storageMd);

  const helpMd = `# Help\n\n- Regenerate docs: \`npm run generate:docs\`\n- The generator parses TSX steps for zod schemas and Supabase calls.\n- Non-generated JSON mirrors are updated automatically.\n- Keep sheet_name constants and zod schemas close to their usage for best results.\n`;
  writeFileSync(join(DOCS, 'HELP.md'), helpMd);
  console.log('Docs generated in docs/*.generated.json');
}

main().catch(err => { console.error(err); process.exit(1); });

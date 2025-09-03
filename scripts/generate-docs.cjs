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

  // Add all step files and lob config to project for analysis
  const stepFiles = await fg(['src/pages/wizard/steps/**/*.tsx'], { cwd: ROOT, absolute: true });
  const configFiles = await fg(['src/config/lobConfig.ts'], { cwd: ROOT, absolute: true });
  [...stepFiles, ...configFiles].forEach(f => project.addSourceFileAtPath(f));

  // Map component keys to concrete step file globs (Property only for now)
  const componentToPath = {
    PropertyHeader: 'src/pages/wizard/steps/property/StepHeader.tsx',
    EpiSummary: 'src/pages/wizard/steps/StepEpiSummary.tsx',
    TreatyStatsProp: 'src/pages/wizard/steps/property/StepTreatyStatsProp.tsx',
    TreatyStatsNonProp: 'src/pages/wizard/steps/property/StepTreatyStatsNonProp.tsx',
    UwLimit: 'src/pages/wizard/steps/property/StepUwLimit.tsx',
    RiskProfile: 'src/pages/wizard/steps/property/StepRiskProfile.tsx',
    CatLossList: 'src/pages/wizard/steps/property/StepCatLossList.tsx',
    LargeLossList: 'src/pages/wizard/steps/property/StepLargeLossList.tsx',
    LargeLossTriangulation: 'src/pages/wizard/steps/property/StepLargeLossTriangulation.tsx',
    Triangulation: 'src/pages/wizard/steps/property/StepTriangulation.tsx',
    CrestaZoneControl: 'src/pages/wizard/steps/property/StepCrestaZoneControl.tsx',
    Top20Risks: 'src/pages/wizard/steps/property/StepTop20Risks.tsx',
    ClimateExposure: 'src/pages/wizard/steps/property/StepClimateExposure.tsx',
  };

  // Extract property tab definitions from lobConfig
  const lobConfig = project.getSourceFileOrThrow(configFiles[0]);
  const propertyTabsArray = lobConfig.getVariableDeclaration('propertyTabs')?.getInitializer();
  const propertyTabs = [];
  if (propertyTabsArray && Node.isArrayLiteralExpression(propertyTabsArray)) {
    for (const el of propertyTabsArray.getElements()) {
      if (!Node.isObjectLiteralExpression(el)) continue;
      const get = (name) => el.getProperty(name)?.getInitializer();
      const key = get('key')?.getText().replace(/['"]/g, '');
      const label = get('label')?.getText().replace(/['"]/g, '');
      const component = get('component')?.getText().replace(/['"]/g, '');
      if (!key || !label || !component) continue;
      propertyTabs.push({ key, label, component });
    }
  }

  function analyzeStepFile(absPath) {
    const sf = project.getSourceFile(absPath);
    if (!sf) return { operations: [], sheetName: undefined };
    const operations = [];
    const zodObjects = new Map();
    let inferredSheet;

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
          const sheet = detectSheetNameFromUpsert(node);
          if (sheet) inferredSheet = sheet;
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
          operations.push({ type: 'sheet_blobs', table: 'sheet_blobs', op: 'upsert', key: ['submission_id','sheet_name'], payloadShape, notes: inferredSheet });
        }
      }
    });

    return { operations, sheetName: inferredSheet };
  }

  // Build property docs based on config order and analyzed step files
  const propertyDocsTabs = [];
  for (const t of propertyTabs) {
    const rel = componentToPath[t.component];
    let analysis = { operations: [], sheetName: undefined };
    if (rel) analysis = analyzeStepFile(join(ROOT, rel));
    propertyDocsTabs.push({
      tabKey: t.key,
      sheetName: analysis.sheetName || t.label || 'Unknown',
      autosave: { strategy: 'debounced' },
      operations: analysis.operations,
    });
  }

  const fieldMap = {
    lob: 'property',
    tabs: propertyDocsTabs.map(t => ({
      tabKey: t.tabKey,
      sheetName: t.sheetName,
      storage: t.operations.map(op => op.type === 'table'
        ? { type: 'table', table: op.table, rowSchema: op.rowShape || {} }
        : { type: 'sheet_blobs', table: 'sheet_blobs', key: ['submission_id','sheet_name'], payloadSchema: op.payloadShape || {} })
    }))
  };

  const slim = {
    lob: 'property',
    tabs: propertyDocsTabs.map(t => {
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

  const storage = { lob: 'Property', generatedAt: new Date().toISOString(), tabs: propertyDocsTabs };

  writeFileSync(join(DOCS, 'field-map.generated.json'), JSON.stringify(fieldMap, null, 2));
  writeFileSync(join(DOCS, 'field-map-slim.generated.json'), JSON.stringify(slim, null, 2));
  writeFileSync(join(DOCS, 'supabase-storage-map.generated.json'), JSON.stringify(storage, null, 2));
  const md = `# Generated Docs\n\nThis folder contains generated files based on parsing step components (Property).\n\n- field-map.generated.json\n- field-map-slim.generated.json\n- supabase-storage-map.generated.json\n\nRegenerate with: npm run generate:docs\n`;
  writeFileSync(join(DOCS, 'GENERATED.md'), md);
  console.log('Docs generated in docs/*.generated.json');
}

main().catch(err => { console.error(err); process.exit(1); });

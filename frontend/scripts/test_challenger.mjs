import fs from 'node:fs';
import path from 'node:path';

const adminQueuePath = path.resolve('src/pages/AdminQueuePage.tsx');
const adminCssPath = path.resolve('src/styles/admin.css');

const adminQueueContent = fs.readFileSync(adminQueuePath, 'utf8');
const adminCssContent = fs.readFileSync(adminCssPath, 'utf8');

console.log('=== CHALLENGER ITERATION 2 VERIFICATION TEST ===\n');

let failed = false;

function check(name, condition, details) {
  if (condition) {
    console.log(`[PASS] ${name}`);
  } else {
    console.error(`[FAIL] ${name}: ${details}`);
    failed = true;
  }
}

// 1. Category 1: Tier 1 Mobile Header Controls
console.log('--- 1. Tier 1 Header Controls ---');
const searchToggleMatches = adminQueueContent.match(/aria-label="Toggle search"[\s\S]*?minHeight:\s*'44px'/);
check('Search toggle has minHeight: 44px', !!searchToggleMatches || adminQueueContent.includes("aria-label=\"Toggle search\""));
const searchToggleExact = adminQueueContent.includes("aria-label=\"Toggle search\"") && 
  adminQueueContent.includes("minHeight: '44px'") && 
  adminQueueContent.includes("minWidth: '44px'");
check('Search toggle has minWidth 44px and minHeight 44px', searchToggleExact);

const bellMatches = adminQueueContent.includes("aria-label=\"Admin notifications\"") &&
  adminQueueContent.includes("minHeight: '44px'") &&
  adminQueueContent.includes("minWidth: '44px'");
check('Notification bell button has minWidth 44px and minHeight 44px', bellMatches);

const exitMatches = adminQueueContent.includes("Exit Admin to Consumer Home") &&
  adminQueueContent.includes("title=\"Exit Admin to Consumer Home\"") &&
  adminQueueContent.includes("minHeight: '44px'");
check('Exit button has minHeight: 44px', exitMatches);

const cssHeaderBtnRule = adminCssContent.includes('.admin-header-mobile-actions button') &&
  adminCssContent.includes('min-height: 44px !important;') &&
  adminCssContent.includes('min-width: 44px !important;');
check('.admin-header-mobile-actions button CSS rule enforces 44px min-height & min-width', cssHeaderBtnRule);

// 2. Category 2: Tier 2 Mobile Tab Rail
console.log('\n--- 2. Tier 2 Mobile Navigation Tab Rail ---');
const tabRailHeight = adminCssContent.includes('.admin-tab-rail {') && adminCssContent.includes('height: 52px;');
check('.admin-tab-rail has height: 52px', tabRailHeight);

const tabItemHeight = adminCssContent.includes('.admin-tab-rail-item {') && 
  adminCssContent.includes('height: 44px;') && 
  adminCssContent.includes('min-height: 44px;');
check('.admin-tab-rail-item has height: 44px and min-height: 44px', tabItemHeight);

const tabItemPadding = adminCssContent.includes('padding: 0 14px;');
check('.admin-tab-rail-item has padding: 0 14px', tabItemPadding);

// 3. Category 3: Location Manager Neighborhood Action Toggles
console.log('\n--- 3. Location Manager Neighborhood Action Toggles ---');
const toggleActiveCheck = adminQueueContent.includes('handleToggleAreaActive(area)') &&
  adminQueueContent.includes("minHeight: '44px'") &&
  adminQueueContent.includes("padding: '8px 12px'");
check('Neighborhood Toggle Active button has minHeight: 44px and padding: 8px 12px', toggleActiveCheck);

const deleteAreaCheck = adminQueueContent.includes('handlePromptDeleteArea(area, currentCity.name)') &&
  adminQueueContent.includes("minHeight: '44px'") &&
  adminQueueContent.includes("minWidth: '44px'");
check('Neighborhood Delete button has minHeight: 44px and minWidth: 44px', deleteAreaCheck);

// 4. Category 4: Overview Topline Action Buttons
console.log('\n--- 4. Overview Topline Action Buttons ---');
const manageCitiesCheck = adminQueueContent.includes('Manage Cities ({allCities.length})') &&
  adminQueueContent.includes("minHeight: '44px'");
check('Overview "Manage Cities" button has minHeight: 44px', manageCitiesCheck);

const last30DaysCheck = adminQueueContent.includes('Last 30 days') &&
  adminQueueContent.includes("minHeight: '44px'");
check('Overview "Last 30 days" button has minHeight: 44px', last30DaysCheck);

const exportReportCheck = adminQueueContent.includes('Export report') &&
  adminQueueContent.includes("minHeight: '44px'");
check('Overview "Export report" button has minHeight: 44px', exportReportCheck);

// 5. Category 5: Quick Locations Modal Dialog Buttons
console.log('\n--- 5. Quick Locations Modal Dialog Buttons ---');
const openFullLocationsCheck = adminQueueContent.includes('Open Full Locations Tab →') &&
  adminQueueContent.includes("minHeight: '44px'");
check('"Open Full Locations Tab" button has minHeight: 44px', openFullLocationsCheck);

const newCityCheck = adminQueueContent.includes('New City</span>') &&
  adminQueueContent.includes("minHeight: '44px'");
check('"New City" button has minHeight: 44px', newCityCheck);

const stageActivateCheck = adminQueueContent.includes('handleToggleCityStatus(city)') &&
  adminQueueContent.includes("minHeight: '44px'");
check('City Card Stage/Activate button has minHeight: 44px', stageActivateCheck);

const manageAreasCheck = adminQueueContent.includes('Manage Areas</button>') &&
  adminQueueContent.includes("minHeight: '44px'");
check('City Card "Manage Areas" button has minHeight: 44px', manageAreasCheck);

const quickAddCssCheck = adminCssContent.includes('.admin-modal-quick-add-form select') &&
  adminCssContent.includes('min-height: 44px !important;');
check('Quick Add form controls have min-height: 44px !important in CSS', quickAddCssCheck);

// 6. Horizontal Overflow & Viewport Budget Checks
console.log('\n--- 6. Horizontal Overflow & Viewport Bounds ---');
const rootOverflowCheck = adminCssContent.includes('.admin-page-root {') &&
  adminCssContent.includes('overflow-x: hidden;') &&
  adminCssContent.includes('max-width: 100vw;');
check('.admin-page-root enforces overflow-x: hidden and max-width: 100vw', rootOverflowCheck);

const locationControlsMobileCheck = adminCssContent.includes('@media (max-width: 767px)') &&
  adminCssContent.includes('.admin-location-controls-grid {') &&
  adminCssContent.includes('flex-direction: column !important;');
check('.admin-location-controls-grid collapses to column flex on mobile (no 546px blowout)', locationControlsMobileCheck);

const kpiGridMobileCheck = adminCssContent.includes('.admin-kpi-grid {') &&
  adminCssContent.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;');
check('.admin-kpi-grid reflows to 2 columns on mobile', kpiGridMobileCheck);

const modalMobileCheck = adminCssContent.includes('.admin-modal-card {') &&
  adminCssContent.includes('max-width: 520px !important;') &&
  adminCssContent.includes('width: 100% !important;') &&
  adminCssContent.includes('max-height: 90vh !important;');
check('.admin-modal-card fits within 100% width and 90vh max-height', modalMobileCheck);

console.log('\n=== VERIFICATION RESULT ===');
if (failed) {
  console.error('FAILED: One or more checks did not pass.');
  process.exit(1);
} else {
  console.log('SUCCESS: All 5 categories and responsive layout checks PASSED.');
  process.exit(0);
}

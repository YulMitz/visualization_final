# Project Understanding: Taiwan Social Change Survey Visualization

## Project Overview

This project aims to create an interactive time-series visualization of Taiwan Social Change Survey (TSCS) data spanning from 1992 to 2022, combining statistical analysis with geographical visualization using d3.js.

## Data Understanding

### Taiwan Social Change Survey (TSCS)

The TSCS is a comprehensive longitudinal survey conducted in Taiwan that tracks social, political, and cultural changes over time. The dataset provided contains:

- **Time Coverage**: 1992 to 2022 (7 survey waves, conducted every 5 years)
- **Data Format**: SPSS (.sav) files with metadata including variable labels and value labels
- **Survey Years**:
  - 1992 (tscs921.sav)
  - 1997 (tscs971_l.sav)
  - 2002 (tscs021.sav)
  - 2007 (tscs071.sav)
  - 2012 (tscs121.sav)
  - 2017 (tscs171.sav)
  - 2022 (tscs221.sav)

### Data Characteristics

Each survey file contains:
- Multiple respondents (sample sizes vary by year)
- Hundreds of variables covering topics like:
  - Demographics (age, gender, education, location)
  - Social attitudes and values
  - Political preferences and participation
  - Economic status and perceptions
  - Cultural practices and beliefs
  - Family structures and relationships

## Implementation Details

### 1. Data Analysis Notebook (`data_analysis.ipynb`)

The Jupyter notebook performs comprehensive data exploration and preparation:

#### Key Features:
- **Data Loading**: Uses `pyreadstat` to properly read SPSS files with metadata preservation
- **Semantic Variable Matching**: Identifies common variables **by their meaning (labels)** across all 7 survey years, not by column names
  - Example: `v_26` (1992) and `v_32` (1997) may both represent "subjective wealth" and are matched as the same concept
  - Uses `column_names_to_labels` metadata to extract variable meanings
- **Variable Mapping Creation**: Builds mappings showing which column name represents each concept in each year
- **Data Quality Assessment**:
  - Calculates missing data percentages for each concept across years
  - Identifies "high-quality" concepts with <10% missing data
  - Ensures data completeness for reliable visualization
- **Metadata Extraction**: Preserves Chinese and English variable labels for meaningful visualization
- **Export Functionality**: Generates JSON summary with label-to-variable mappings for easy integration with d3.js

#### Analysis Workflow:
1. Import all 7 TSCS datasets with metadata
2. Extract variable labels (meanings) from metadata for each year
3. Find labels that appear in ALL years (semantic matching across different variable names)
4. Create mappings: `{concept_label: {1992: 'v_26', 1997: 'v_32', ...}}`
5. Assess data completeness and quality for each concept
6. Generate summary statistics and recommended concepts
7. Export structured data with label mappings for visualization

#### Expected Outputs:
- List of common concepts (by label/meaning) suitable for time-series analysis
- Variable name mappings for each concept across all years
- Data quality metrics by year for each concept
- `tscs_variable_summary.json` with label mappings for visualization reference

### 2. Taiwan Map Visualization (`taiwan_map_demo.html`)

An interactive d3.js-based geographical visualization of Taiwan:

#### Technical Implementation:
- **Framework**: D3.js v7 for data-driven visualization
- **Projection**: Mercator projection centered on Taiwan (121°E, 23.5°N)
- **Coverage**: All 22 administrative divisions (cities and counties)
- **Interactivity**:
  - Hover effects showing region details
  - Click-to-zoom functionality for detailed exploration
  - Pan and zoom controls for navigation
  - Toggle labels for cleaner visualization

#### Map Features:
- **Counties/Cities Included**:
  - 6 Special Municipalities: Taipei, New Taipei, Taoyuan, Taichung, Tainan, Kaohsiung
  - 3 Provincial Cities: Keelung, Hsinchu, Chiayi
  - 13 Counties: Including Yilan, Hualien, Taitung, Penghu, Kinmen, Lienchiang, etc.
- **Data Attributes**: Region name (Chinese & English), population estimates
- **Simplified Geometry**: Using polygon approximations for demo purposes

#### Visualization Controls:
- **Reset Zoom**: Return to original view
- **Toggle Labels**: Show/hide region names
- **Tooltip**: Dynamic information on hover
- **Info Panel**: Selected region details

### 3. Future Integration Strategy

The current implementation sets up two independent components that can be integrated:

#### Phase 1 (Current - Complete):
- Data analysis infrastructure
- Basic geographical visualization
- Understanding of common variables

#### Phase 2 (Future Integration):
- **Choropleth Maps**: Color regions by survey responses (e.g., political preference, satisfaction levels)
- **Time Animation**: Animate changes across the 7 survey years (1992-2022)
- **Interactive Filtering**: Allow users to select specific variables and time ranges
- **Multi-view Coordination**: Link map with time-series charts showing trends

#### Potential Visualizations:
1. **Geographic Patterns**: Show how attitudes vary across regions
2. **Temporal Changes**: Animate 30 years of social change
3. **Comparative Analysis**: Side-by-side comparison of different years
4. **Correlation Exploration**: Relate demographic factors to attitudes

## Technical Considerations

### Data Challenges:
1. **Variable Name Inconsistency**: Same questions may have different variable names across years (e.g., v_26 in 1992, v_32 in 1997)
   - Solution: Use semantic matching via variable labels from `column_names_to_labels` metadata
   - Create mappings to track which variable name represents each concept in each year
2. **Question Evolution**: Not all questions asked in every survey year; some questions added/removed over time
   - Solution: Focus on concepts with labels appearing in all 7 years
   - Also identify concepts in 5-6 years for partial time-series analysis
3. **Missing Data**: Varying response rates across years and regions
   - Solution: Quality filters implemented in the analysis (<10% missing threshold)
4. **Regional Granularity**: Survey may not have sufficient samples for all counties
   - Solution: May need to aggregate to larger regions (North, Central, South, East)
5. **Language**: Chinese variable labels require proper UTF-8 handling
   - Solution: Ensured proper encoding in both Python and HTML

### Visualization Challenges:
1. **Map Accuracy**: Current implementation uses simplified polygons
   - Future: Use TopoJSON with accurate Taiwan boundaries
2. **Data Binding**: Need to match survey location variables to map regions
   - Requires mapping between survey codes and geographical units
3. **Scale**: Balancing detail vs. performance for web visualization
4. **Responsiveness**: Ensuring visualization works on different screen sizes

## Project Strengths

1. **Longitudinal Perspective**: 30 years of data enables meaningful trend analysis
2. **Geographical Context**: Taiwan's compact size allows for detailed regional analysis
3. **Rich Metadata**: SPSS format preserves valuable variable and value labels
4. **Interactive Design**: D3.js enables engaging, exploratory visualization
5. **Modular Structure**: Separate data processing and visualization for flexibility

## Recommendations for Next Steps

1. **Data Preparation**:
   - Run the Jupyter notebook to identify specific concepts of interest (by label)
   - Review the label-to-variable mappings to understand which columns to use for each year
   - Clean and aggregate data by region
   - Create time-series datasets for each common concept using the appropriate variable name for each year

2. **Visualization Enhancement**:
   - Obtain accurate Taiwan TopoJSON for better map fidelity
   - Implement color scales for quantitative data display
   - Add time slider for temporal exploration
   - Create linked views (map + line charts)

3. **Analysis Focus**:
   - Select 3-5 key concepts (by label) that tell compelling stories
   - Consider themes: democratization, economic development, social values
   - Document data sources, methodology, and variable name mappings for transparency

4. **User Experience**:
   - Add legends explaining color scales
   - Provide context about TSCS and survey methodology
   - Include narrative text to guide exploration
   - Ensure accessibility (screen readers, color blindness)

## Conclusion

This project combines rigorous data analysis with interactive visualization to explore three decades of social change in Taiwan. The modular approach allows for iterative development, starting with data exploration and basic geographical display, then progressing toward integrated, insight-driven visualizations.

**Key Innovation**: By using semantic matching of variable labels rather than simple column name matching, the analysis correctly handles the reality of longitudinal survey data where the same questions may have different variable names across years. This approach ensures accurate time-series tracking of social concepts despite naming inconsistencies.

The TSCS dataset is particularly valuable for understanding Taiwan's rapid social transformation, including democratization, economic growth, and cultural shifts. By combining temporal and spatial dimensions, this visualization can reveal patterns and trends that pure statistical analysis might miss.

The foundation is now in place to build a compelling, educational visualization that showcases both technical proficiency in data science and design sensibility in information presentation.

---

## Project Implementation Plan

### Implementation Overview

Based on the detailed specifications in `Visualization Final.md`, this project will create a comprehensive web-based visualization system for analyzing subjective vs. objective wealth patterns across Taiwan from 1992-2022.

### Core Features Required

1. **Five Main Panels**:
   - Overview Panel: Project introduction and navigation
   - Geographical View Panel: Interactive Taiwan map with grid overlay
   - Years Analysis Panels: Individual Sankey diagrams for each year (1992-2022)
   - Comparison Panel: Multi-line chart showing trends over time

2. **Data Processing Requirements**:
   - Extract subjective wealth from specific variables per year
   - Calculate objective wealth classification using household income quintiles
   - Handle special cases (2002 working class, 2017 multiple job records, 1992 housewives)
   - Standardize wealth categories for visualization

3. **Technical Stack**:
   - Frontend: HTML, CSS, JavaScript with D3.js v7
   - Data Processing: Python with pandas, pyreadstat
   - Map Data: GeoJSON files (COUNTY and TOWN levels)

### Work Breakdown Structure

#### **Phase 1: Data Processing Pipeline** (Priority: CRITICAL)
**Deliverables**: Python script to generate processed JSON data

**Tasks**:
1. Create `prepare_wealth_data.py` script
2. Load all 7 SPSS files (1992, 1997, 2002, 2007, 2012, 2017, 2022)
3. Extract subjective wealth variables:
   - 1992: v65a → 6 classes
   - 1997: v89a → 6 classes
   - 2002: v126 + v125 logic → 6 classes (add working class)
   - 2007: f5 → 6 classes
   - 2012: v94 → 6 classes
   - 2017: e2 → 6 classes
   - 2022: e2 → 6 classes
4. Calculate objective wealth using household income quintiles:
   - Use household income variable (priority order defined per year)
   - Convert monthly to annual income (×12)
   - Classify into 5 categories: 低、中低、中等、中高、高
   - Special handling for 1992 housewives (female, income < threshold/2)
   - Special handling for 2017 multiple job records (find last recorded job)
5. Extract happiness/satisfaction variables per year
6. Link ZIP codes to geographical regions (COUNTY level)
7. Generate output JSON files:
   - `wealth_data_[year].json` for each year (for Sankey diagrams)
   - `comparison_data.json` for time-series trends
   - `geo_data_[year].json` for geographical visualization

**Data Structure Examples**:
```json
// wealth_data_1992.json
{
  "year": 1992,
  "records": [
    {
      "subjective": "中層階級",
      "objective": "中等",
      "region": "台北市",
      "happiness": 3.5
    }
  ],
  "summary": {
    "total_samples": 1234,
    "by_subjective": {...},
    "by_objective": {...}
  }
}

// comparison_data.json
{
  "years": [1992, 1997, 2002, ...],
  "subjective_avg": [3.2, 3.4, 3.3, ...],
  "objective_avg": [2.8, 3.1, 3.2, ...],
  "happiness_avg": [3.5, 3.6, 3.4, ...]
}
```

---

#### **Phase 2: Base Web Structure** (Priority: HIGH)
**Deliverables**: HTML page with panel navigation

**Tasks**:
1. Create `index.html` with responsive layout
2. Design navigation sidebar for 5 panels
3. Implement panel switching logic
4. Add CSS styling for consistent look
5. Load D3.js v7 library
6. Create placeholder sections for all panels

**UI Requirements**:
- Sidebar navigation (fixed position)
- Main content area (scrollable)
- Responsive design (desktop priority)
- Clean, academic aesthetic

---

#### **Phase 3: Overview Panel** (Priority: MEDIUM)
**Deliverables**: Introductory panel with project description

**Tasks**:
1. Write project introduction text
2. Explain data source (TSCS)
3. Describe subjective vs. objective wealth concepts
4. Add methodology summary
5. Include navigation hints

**Content Outline**:
- Project title and subtitle
- Research question
- Dataset description (7 waves, 30 years)
- Key concepts explanation
- Visualization guide

---

#### **Phase 4: Geographical View Panel** (Priority: HIGH)
**Deliverables**: Interactive Taiwan map with data overlay

**Tasks**:
1. Load GeoJSON files (Taiwan_COUNTY_GEO.json, Taiwan_TOWN_GEO.json)
2. Implement Mercator projection (center: [121, 24])
3. Add zoom-based level switching (COUNTY ↔ TOWN)
4. Create 150px × 150px grid overlay (fixed size, not affected by zoom)
5. Implement year selector dropdown (1992-2022)
6. Color regions by wealth metrics
7. Add tooltip on hover (region name, statistics)
8. Add click interaction (detailed view)

**Technical Specifications**:
- Projection: `d3.geoMercator().center([121, 24]).scale(mercatorScale)`
- Grid: SVG `<rect>` elements, 150px square, layered above map
- Responsive scale: >1366px → 11000, 1366-480px → 9000, <480px → 6000
- Color scale: Use d3.scaleOrdinal for categorical data
- Year selector: HTML `<select>` with event listener

---

#### **Phase 5: Years Analysis Panels** (Priority: HIGH)
**Deliverables**: 7 collapsible panels with Sankey diagrams

**Tasks**:
1. Create collapsible panel structure (accordion)
2. Implement Sankey diagram for each year using D3-sankey
3. Left nodes: Subjective wealth (6 categories)
4. Right nodes: Objective wealth (5 categories)
5. Links: Flow between categories (sample counts)
6. Color coding by subjective category
7. Add hover tooltips showing exact counts
8. Responsive sizing

**Sankey Specifications**:
- Library: d3-sankey plugin
- Width: 100% of panel, Height: 600px
- Node labels: Chinese category names
- Link opacity: 0.3 (default), 0.7 (hover)
- Color palette: Sequential scheme for wealth levels

**Categories**:
- Subjective (left): 上層階級, 中上層階級, 中層階級, 中下層階級, 勞工階級, 下層階級
- Objective (right): 高, 中高, 中等, 中低, 低

---

#### **Phase 6: Comparison Panel** (Priority: HIGH)
**Deliverables**: Multi-axis line chart showing 30-year trends

**Tasks**:
1. Create line chart with D3.js
2. X-axis: Years (1992, 1997, 2002, 2007, 2012, 2017, 2022)
3. Left Y-axis: Standardized wealth scores (0-1 scale)
4. Right Y-axis: Average happiness (original scale)
5. Three lines:
   - Subjective wealth (normalized)
   - Objective wealth (normalized)
   - Happiness (average)
6. Add legend
7. Add gridlines
8. Interactive tooltips showing exact values

**Normalization**:
- Subjective wealth: Map 6 categories to 0-1 scale
- Objective wealth: Map 5 categories to 0-1 scale
- Happiness: Calculate mean per year

**Chart Specifications**:
- Width: 100% of panel, Height: 500px
- Line styles: Different colors and dash patterns
- Dual Y-axis with different scales
- Legend: Top-right corner

---

#### **Phase 7: Integration & Testing** (Priority: CRITICAL)
**Deliverables**: Fully functional, tested website

**Tasks**:
1. Test data processing pipeline with all 7 datasets
2. Verify data accuracy (spot-check calculations)
3. Test all interactions (hover, click, zoom, pan)
4. Cross-browser testing (Chrome, Firefox, Safari)
5. Performance optimization (lazy loading, data caching)
6. Responsive design testing
7. Accessibility check (keyboard navigation, ARIA labels)
8. Documentation updates

**Testing Checklist**:
- [ ] All 7 years load correctly
- [ ] Map zoom/pan works smoothly
- [ ] Grid overlay remains 150px squares
- [ ] Sankey diagrams show correct flows
- [ ] Comparison chart shows trends
- [ ] Tooltips display accurate data
- [ ] No console errors
- [ ] Loads in <3 seconds

---

### Technical Specifications Summary

**Python Data Processing**:
```python
# Key libraries
import pandas as pd
import pyreadstat
import json
import numpy as np

# Income quintile thresholds (annual, NT$)
income_thresholds = {
    1992: [235752, 423392, 560466, 742466, 1236408],
    1997: [312458, 557429, 753919, 1003815, 1689517],
    # ... etc
}

# Subjective wealth variables
subjective_vars = {
    1992: 'v65a',
    1997: 'v89a',
    2002: 'v126',  # + v125 logic
    2007: 'f5',
    2012: 'v94',
    2017: 'e2',
    2022: 'e2'
}

# Output classification
objective_classes = ['低', '中低', '中等', '中高', '高']
subjective_classes = ['下層階級', '勞工階級', '中下層階級', '中層階級', '中上層階級', '上層階級']
```

**D3.js Visualization**:
```javascript
// Map projection
const projection = d3.geoMercator()
  .center([121, 24])
  .scale(mercatorScale)
  .translate([width/2, height/2.5]);

// Grid overlay
const gridSize = 150;  // Fixed 150px squares
// Calculate grid based on map bounds

// Sankey layout
const sankey = d3.sankey()
  .nodeWidth(15)
  .nodePadding(10)
  .extent([[1, 1], [width - 1, height - 6]]);

// Line chart scales
const xScale = d3.scalePoint()
  .domain([1992, 1997, 2002, 2007, 2012, 2017, 2022])
  .range([margin.left, width - margin.right]);

const yScaleLeft = d3.scaleLinear()
  .domain([0, 1])
  .range([height - margin.bottom, margin.top]);

const yScaleRight = d3.scaleLinear()
  .domain([1, 5])  // Happiness scale
  .range([height - margin.bottom, margin.top]);
```

---

### Phase 5: Animated Sankey Diagrams (Updated Specification)

#### Overview
Instead of accordion-based static Sankey diagrams, each year (1992-2022) will be a **separate subpage** accessible from the sidebar under "年度分析". Each year's visualization will feature an **animated particle flow system** inspired by New York Times' mobility visualizations.

#### Navigation Structure
```
Sidebar → 年度分析 → 下拉選單:
  - 1992年分析
  - 1997年分析
  - 2002年分析
  - 2007年分析
  - 2012年分析
  - 2017年分析
  - 2022年分析
```

#### Animation Specification

**Sequential Class Animation:**
1. Animation plays through each subjective class in order:
   - 勞工階級 (Working Class) → first
   - 下層階級 (Lower Class)
   - 中下層階級 (Lower-Middle Class)
   - 中層階級 (Middle Class)
   - 中上層階級 (Upper-Middle Class)
   - 上層階級 (Upper Class) → last

**Visual Flow Animation:**
- **Particle representation**: Each small square/dot represents one sample
- **Flow mechanics**: Particles flow from source (subjective class) to target (objective class) along curved paths
- **Density correlation**: More samples = more particles on that path
- **Focus management**:
  - Active class: Full opacity (1.0)
  - Inactive classes: Reduced opacity (~0.2)
  - Clear visual hierarchy guides attention

**Technical Implementation:**

1. **Canvas-based particle system** (WebGL/Canvas 2D):
   ```javascript
   // Particle properties
   {
     position: {x, y},
     velocity: {vx, vy},
     path: bezierCurve,
     progress: 0-1,
     sourceClass: '勞工階級',
     targetClass: '低'
   }
   ```

2. **Path generation** (SVG paths):
   ```javascript
   // Bezier curves for smooth flows
   const path = `M ${x0},${y0}
                 C ${cx1},${cy1} ${cx2},${cy2}
                 ${x1},${y1}`
   ```

3. **Animation loop**:
   ```javascript
   // Sequential class animation
   for each class in order:
     1. Fade out other paths (opacity: 0.2)
     2. Spawn particles for current class
     3. Animate particles along paths (2-3 seconds)
     4. Fade in next class paths
   ```

4. **Data binding**:
   ```javascript
   // Calculate particle count per path
   const particlesPerPath = Math.floor(linkValue / samplingRate)
   // samplingRate: e.g., 1 particle per 10 samples
   ```

#### Reference: NYT Implementation Analysis

From the provided HTML structure, key elements:

**Canvas layer** (WebGL for particle rendering):
```html
<canvas width="1808" height="996"
        style="width: 904px; height: 498px;"></canvas>
```

**SVG layer** (paths and labels):
```html
<path class="race-paths"
      d="M 0,37.085... C 459.5,37.085... 578.97,460.914... L 919,460.914"
      style="stroke-width: 74.170213;"></path>
```

**Key techniques to adopt:**
1. **Dual-layer rendering**: Canvas for particles, SVG for structure
2. **Bezier path curves**: Smooth visual flow (cubic Bezier)
3. **Opacity modulation**: Focus control via transparency
4. **Staggered timing**: Sequential animation through classes

#### Data Requirements

Same as existing Phase 5:
- Source: `wealth_data_{year}.json`
- Structure: nodes (subjective/objective), links (flows with counts)
- No additional data processing needed

#### User Interaction

**Automatic playback**:
- Animation starts on page load
- Full cycle: ~15-20 seconds (all 6 classes)
- Loops continuously

**Controls** (optional future enhancement):
- Play/Pause button
- Speed control (0.5x, 1x, 2x)
- Click to jump to specific class
- Restart animation

---

### File Structure

```
/home/mulkooo/visualization/final/
├── index.html                  # Main webpage
├── css/
│   └── style.css               # Styling
├── js/
│   ├── main.js                 # Main application logic
│   ├── overview.js             # Overview panel
│   ├── geographical.js         # Map visualization
│   ├── sankey.js               # Sankey diagrams
│   └── comparison.js           # Comparison chart
├── data/
│   ├── processed/              # Generated by Python
│   │   ├── wealth_data_1992.json
│   │   ├── wealth_data_1997.json
│   │   ├── ...
│   │   ├── comparison_data.json
│   │   └── geo_data_*.json
│   └── raw/                    # SPSS files (existing)
├── map/
│   ├── Taiwan_COUNTY_GEO.json  # County-level boundaries
│   └── Taiwan_TOWN_GEO.json    # Town-level boundaries
├── prepare_wealth_data.py      # Data processing script
├── CLAUDE.md                   # This documentation
└── Visualization Final.md      # Requirements specification
```

---

### Data Location

**SPSS Data Files Path**: `/home/mulkooo/visualization/vi_data/`

This directory contains all 7 TSCS SPSS files:
- tscs921.sav (1992)
- tscs971_l.sav (1997)
- tscs021.sav (2002)
- tscs071.sav (2007)
- tscs121.sav (2012)
- tscs171.sav (2017)
- tscs221.sav (2022)

### Development Notes

**Critical Considerations**:
1. **2002 Working Class Logic**: Must check both v126 (中下層) AND v125 (工與農民階級) to identify working class
2. **2017 Job Records**: Iterate through c4001n to c4023n to find last non-null value
3. **1992 Housewives**: Female respondents with annual income < 117,876 NT$ should be excluded
4. **ZIP Code Mapping**: Need to create mapping from survey ZIP codes to GeoJSON COUNTYCODE
5. **Grid Overlay**: Must be calculated in screen coordinates, not geo coordinates, to maintain 150px size

**Performance Optimizations**:
- Use `d3.json()` for async data loading
- Implement lazy loading for panel content
- Cache processed data in browser localStorage
- Use D3 data joins efficiently (enter/update/exit pattern)

**Browser Compatibility**:
- Target modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Use D3.js v7 (ES6 modules)
- Polyfills not required for target audience

---

**Created by**: Claude (Anthropic AI)
**Last Updated**: December 11, 2025
**Purpose**: Visualization Final Project Documentation & Implementation Plan

/**
 * Geographical visualization for Taiwan map - FIXED VERSION
 * Handles map rendering, zoom, and data overlay
 */

// Global variables
let mapSvg, mapGroup, projection, pathGenerator, currentZoom = 1;
let countyData, townData;
let gridVizData = null; // Grid visualization data (age-segmented wealth by ZIP code)
let currentWealthMode = 'subjective'; // 'subjective' or 'objective'
let currentYear = '2022'; // Default year
let gridUpdateTimeout = null; // Timeout for debouncing grid updates
let currentTransform = d3.zoomIdentity; // Store current zoom transform

// Constants from demo
const AGE_GROUPS = ['0-14歲', '15-24歲', '25-34歲', '35-44歲', '45-54歲', '55-64歲', '65歲以上'];

// Color schemes (low saturation)
const SUBJECTIVE_CLASSES = {
    '下層階級': '#a08080',      // 暗紅褐
    '勞工階級': '#c89090',      // 淺紅褐
    '中下層階級': '#d4b896',    // 淺黃褐
    '中層階級': '#9db7c4',      // 淺藍灰
    '中上層階級': '#a8c4a8',    // 淺綠灰
    '上層階級': '#789078'       // 暗綠灰
};

const OBJECTIVE_CLASSES = {
    '低': '#a08080',            // 暗紅褐
    '中低': '#c89090',          // 淺紅褐
    '中等': '#d4b896',          // 淺黃褐
    '中高': '#a8c4a8',          // 淺綠灰
    '高': '#789078'             // 暗綠灰
};

/**
 * Initialize the Taiwan map
 */
function initializeMap() {
    console.log('Initializing Taiwan map...');

    // Set up dimensions
    const container = document.getElementById('map-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create SVG
    mapSvg = d3.select('#map-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create groups for map layers
    mapGroup = mapSvg.append('g').attr('class', 'map-group');

    // Set up projection
    projection = d3.geoMercator()
        .center([121, 23.5])
        .scale(getResponsiveScale())
        .translate([width / 2, height / 2]);

    // Use simplified path generator with lower precision
    // This prevents issues with extremely detailed polygons
    pathGenerator = d3.geoPath()
        .projection(projection)
        .pointRadius(1.5);

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
            // Store previous zoom for level change detection
            const previousZoom = currentZoom;
            currentZoom = event.transform.k;
            currentTransform = event.transform; // Store current transform for projection calculations

            // Apply transform to map (this is fast and doesn't cause lag)
            mapGroup.attr('transform', event.transform);

            // Determine if we need to switch map detail levels
            const shouldShowTown = currentZoom > 3 && townData;
            const wasShowingTown = previousZoom > 3;

            // Switch between county and town view based on zoom level (fast operation)
            if (shouldShowTown !== wasShowingTown) {
                if (shouldShowTown) {
                    showTownLevel();
                } else {
                    showCountyLevel();
                }
            }
        })
        .on('end', () => {
            // This event fires when user STOPS panning/zooming
            // Wait 500ms after stopping before recalculating grid
            console.log(`[ZOOM END] User stopped at zoom ${currentZoom.toFixed(2)}, scheduling grid update in 500ms`);

            // Clear any existing timeout
            if (gridUpdateTimeout) {
                console.log(`[GRID UPDATE] Clearing previous debounce timer`);
                clearTimeout(gridUpdateTimeout);
            }

            // Schedule grid update after 500ms of inactivity
            gridUpdateTimeout = setTimeout(() => {
                console.log('⏱️ [GRID UPDATE] Debounce timer fired - updating grid data now');
                createGridOverlay();
                gridUpdateTimeout = null;
            }, 500);
        });

    mapSvg.call(zoom);

    // Load TopoJSON data (already simplified)
    Promise.all([
        d3.json('map/Taiwan_COUNTY_topo.json'),
        d3.json('map/Taiwan_TOWN_topo.json')
    ]).then(([countyTopo, townTopo]) => {
        // Convert TopoJSON to GeoJSON
        // TopoJSON files should have a specific structure - let's check the object keys
        console.log('County TopoJSON keys:', Object.keys(countyTopo.objects));
        console.log('Town TopoJSON keys:', Object.keys(townTopo.objects));

        // Typically the main object is the first one or has a descriptive name
        const countyObjectKey = Object.keys(countyTopo.objects)[0];
        const townObjectKey = Object.keys(townTopo.objects)[0];

        const county = topojson.feature(countyTopo, countyTopo.objects[countyObjectKey]);
        const town = topojson.feature(townTopo, townTopo.objects[townObjectKey]);

        // Filter out outlier coordinates (remote islands that skew the projection)
        countyData = filterOutlierCoordinates(county);
        townData = filterOutlierCoordinates(town);

        console.log('County features:', countyData.features.length);
        console.log('Town features:', townData.features.length);

        // Initial render at county level
        renderCountyMap();

        // Load default year data and create grid
        loadMapData(currentYear);

        console.log('Taiwan map loaded successfully');
    }).catch(error => {
        console.error('Error loading map data:', error);
        showMapError();
    });

    // Set up year selector
    const yearSelect = document.getElementById('year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', function() {
            const selectedYear = this.value;
            console.log('Year changed to:', selectedYear);
            loadMapData(selectedYear);
        });
    }

    // Add legend
    createLegend();

    // Handle window resize - recreate grid when window size changes
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (mapSvg) {
                // Update SVG dimensions
                const container = document.getElementById('map-container');
                const width = container.clientWidth;
                const height = container.clientHeight;

                mapSvg.attr('width', width).attr('height', height);

                // Update projection
                projection.translate([width / 2, height / 2]);

                // Recreate grid with new dimensions (uses default grid size)
                createGridOverlay();

                // Re-render map
                if (currentZoom > 3 && townData) {
                    renderTownMap();
                } else {
                    renderCountyMap();
                }

                console.log('Map resized and grid recreated');
            }
        }, 250); // Debounce resize events
    });

    console.log('Map initialization complete');
}

/**
 * Filter out outlier coordinates from GeoJSON data
 * Simply filters out features that are outside Taiwan main area
 * Does NOT modify geometry - just removes entire features
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Object} Filtered GeoJSON
 */
function filterOutlierCoordinates(geojson) {
    // Taiwan main island + nearby islands reasonable bounds
    // Longitude: 118-122, Latitude: 21.5-26
    const lonMin = 118, lonMax = 122;
    const latMin = 21.5, latMax = 26;

    /**
     * Check if a feature has any coordinates in the valid range
     */
    function isFeatureInRange(feature) {
        const geometry = feature.geometry;
        if (!geometry || !geometry.coordinates) return false;

        // Get all coordinates from the geometry
        const allCoords = [];

        if (geometry.type === 'Polygon') {
            geometry.coordinates.forEach(ring => {
                allCoords.push(...ring);
            });
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => {
                polygon.forEach(ring => {
                    allCoords.push(...ring);
                });
            });
        }

        // Check if at least 50% of coordinates are in range
        const coordsInRange = allCoords.filter(([lon, lat]) => {
            return lon >= lonMin && lon <= lonMax &&
                   lat >= latMin && lat <= latMax;
        });

        return coordsInRange.length > allCoords.length * 0.5;
    }

    const filteredFeatures = geojson.features.filter(feature => {
        const inRange = isFeatureInRange(feature);
        if (!inRange) {
            const name = feature.properties?.COUNTYNAME || feature.properties?.TOWNNAME || feature.properties?.NAME || '未知';
            console.log(`Filtering out: ${name} (outside range)`);
        }
        return inRange;
    });

    console.log(`Kept ${filteredFeatures.length} features, filtered ${geojson.features.length - filteredFeatures.length} features`);

    return {
        ...geojson,
        features: filteredFeatures
    };
}

/**
 * Get responsive scale based on window width
 * @returns {number} Scale value
 */
function getResponsiveScale() {
    const width = window.innerWidth;
    if (width > 1366) {
        return 7000;
    } else if (width >= 480) {
        return 6000;
    } else {
        return 4000;
    }
}

/**
 * Render county-level map
 */
function renderCountyMap() {
    if (!countyData) return;

    console.log('Rendering county map with', countyData.features.length, 'features');

    // Clear existing paths
    mapGroup.selectAll('path').remove();

    // Draw county boundaries
    mapGroup.selectAll('path.county')
        .data(countyData.features)
        .enter()
        .append('path')
        .attr('class', 'county')
        .attr('d', d => {
            try {
                const countyName = d.properties?.COUNTYNAME || d.properties?.NAME || '未知';
                const path = pathGenerator(d);

                // Debug logging for 新竹縣
                if (countyName.includes('新竹')) {
                    console.log('=== 新竹縣 Debug Info (AFTER simplification) ===');
                    console.log('County name:', countyName);
                    console.log('Geometry type:', d.geometry.type);
                    if (d.geometry.type === 'Polygon') {
                        console.log('Rings:', d.geometry.coordinates.map(ring => ring.length));
                        console.log('Total points:', d.geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0));
                    } else if (d.geometry.type === 'MultiPolygon') {
                        console.log('Polygons:', d.geometry.coordinates.length);
                        let totalPoints = 0;
                        d.geometry.coordinates.forEach((polygon, i) => {
                            const points = polygon.map(ring => ring.length);
                            console.log(`Polygon ${i} rings:`, points);
                            totalPoints += points.reduce((a, b) => a + b, 0);
                        });
                        console.log('Total points across all polygons:', totalPoints);
                    }
                    console.log('Generated path (first 200 chars):', path?.substring(0, 200));
                    console.log('Path length:', path?.length);
                }

                // Check if path is valid
                if (!path || path === 'undefined' || path.includes('NaN')) {
                    console.error('Invalid path for feature:', countyName);
                    return null;
                }
                return path;
            } catch (e) {
                console.error('Error generating path:', e, d.properties?.COUNTYNAME || d.properties?.NAME);
                return null;
            }
        })
        .attr('fill', '#e8f4f8')
        .attr('stroke', '#2c3e50')
        .attr('stroke-width', 1.5)
        .attr('fill-rule', 'evenodd')  // Important: use even-odd fill rule to handle complex polygons
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('fill', '#3498db')
                .attr('stroke-width', 2.5);

            const countyName = d.properties.COUNTYNAME || d.properties.NAME || '未知縣市';
            showTooltip(`<strong>${countyName}</strong>`, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('fill', '#e8f4f8')
                .attr('stroke-width', 1.5);

            hideTooltip();
        })
        .on('click', function(_event, d) {
            const countyName = d.properties.COUNTYNAME || d.properties.NAME || '未知縣市';
            console.log('Clicked county:', countyName);
        });

    console.log('County map rendered');
}

/**
 * Render town-level map
 */
function renderTownMap() {
    if (!townData) return;

    console.log('Rendering town map with', townData.features.length, 'features');

    // Clear existing paths
    mapGroup.selectAll('path').remove();

    // Draw town boundaries
    mapGroup.selectAll('path.town')
        .data(townData.features)
        .enter()
        .append('path')
        .attr('class', 'town')
        .attr('d', d => {
            try {
                const path = pathGenerator(d);
                // Check if path is valid
                if (!path || path === 'undefined' || path.includes('NaN')) {
                    console.error('Invalid path for feature:', d.properties?.TOWNNAME || d.properties?.NAME);
                    return null;
                }
                return path;
            } catch (e) {
                console.error('Error generating path:', e, d.properties?.TOWNNAME || d.properties?.NAME);
                return null;
            }
        })
        .attr('fill', '#e8f4f8')
        .attr('stroke', '#34495e')
        .attr('stroke-width', 0.5)
        .attr('fill-rule', 'evenodd')  // Important: use even-odd fill rule to handle complex polygons
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('fill', '#3498db')
                .attr('stroke-width', 1.5);

            const townName = d.properties.TOWNNAME || d.properties.NAME || '未知鄉鎮';
            showTooltip(`<strong>${townName}</strong>`, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('fill', '#e8f4f8')
                .attr('stroke-width', 0.5);

            hideTooltip();
        });

    console.log('Town map rendered');
}

/**
 * Show county-level view
 */
function showCountyLevel() {
    if (mapGroup.selectAll('path.county').empty()) {
        renderCountyMap();
    } else {
        mapGroup.selectAll('path.town').attr('display', 'none');
        mapGroup.selectAll('path.county').attr('display', null);
    }
}

/**
 * Show town-level view
 */
function showTownLevel() {
    if (mapGroup.selectAll('path.town').empty()) {
        renderTownMap();
    } else {
        mapGroup.selectAll('path.county').attr('display', 'none');
        mapGroup.selectAll('path.town').attr('display', null);
    }
}

/**
 * Show error message on map
 */
function showMapError() {
    const container = document.getElementById('map-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    mapSvg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e74c3c')
        .style('font-size', '18px')
        .text('⚠️ 無法載入地圖資料');

    mapSvg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 30)
        .attr('text-anchor', 'middle')
        .attr('fill', '#95a5a6')
        .style('font-size', '14px')
        .text('請確認 GeoJSON 檔案是否存在');
}

/**
 * Create legend for the map
 */
function createLegend() {
    const legend = d3.select('#map-legend');
    legend.html('');

    legend.append('h3')
        .style('margin-bottom', '10px')
        .style('font-size', '1.1em')
        .text('地圖圖例');

    legend.append('p')
        .style('margin-bottom', '8px')
        .html('<strong>縮放等級：</strong>');

    legend.append('ul')
        .style('list-style', 'none')
        .style('padding', '0')
        .html(`
            <li style="margin-bottom: 5px;">📍 預設檢視：縣市層級</li>
            <li style="margin-bottom: 5px;">🔍 放大 (Zoom > 3x)：鄉鎮層級</li>
            <li style="margin-bottom: 5px;">🖱️ 滑鼠滾輪：縮放地圖</li>
            <li style="margin-bottom: 5px;">🖱️ 拖曳：移動地圖</li>
        `);

    // Display options section
    legend.append('p')
        .style('margin-top', '15px')
        .style('margin-bottom', '8px')
        .html('<strong>顯示選項：</strong>');

    // Grid toggle button
    legend.append('button')
        .attr('id', 'grid-toggle')
        .style('padding', '5px 10px')
        .style('margin-bottom', '5px')
        .style('margin-right', '5px')
        .style('cursor', 'pointer')
        .style('background-color', '#3498db')
        .style('color', 'white')
        .style('border', 'none')
        .style('border-radius', '4px')
        .text('🔲 隱藏網格')
        .on('click', function() {
            toggleGrid();
        });

    // Wealth mode toggle section
    legend.append('p')
        .style('margin-top', '15px')
        .style('margin-bottom', '8px')
        .html('<strong>財富分類：</strong>');

    // Create button group for wealth mode toggle
    const buttonGroup = legend.append('div')
        .style('display', 'flex')
        .style('gap', '5px')
        .style('margin-bottom', '10px');

    buttonGroup.append('button')
        .attr('id', 'btn-subjective')
        .attr('class', 'wealth-mode-btn active')
        .style('padding', '5px 10px')
        .style('cursor', 'pointer')
        .style('background-color', '#e74c3c')
        .style('color', 'white')
        .style('border', 'none')
        .style('border-radius', '4px')
        .text('主觀財富')
        .on('click', function() {
            switchWealthMode('subjective');
        });

    buttonGroup.append('button')
        .attr('id', 'btn-objective')
        .attr('class', 'wealth-mode-btn')
        .style('padding', '5px 10px')
        .style('cursor', 'pointer')
        .style('background-color', '#3498db')
        .style('color', 'white')
        .style('border', 'none')
        .style('border-radius', '4px')
        .text('客觀財富')
        .on('click', function() {
            switchWealthMode('objective');
        });

    // Color legend
    legend.append('p')
        .style('margin-top', '15px')
        .style('margin-bottom', '8px')
        .html('<strong>財富分類顏色：</strong>');

    updateColorLegend();

    legend.append('p')
        .style('margin-top', '15px')
        .style('font-size', '0.9em')
        .style('color', '#7f8c8d')
        .text('提示：選擇不同年度以顯示該年度的財富分布資料');
}

/**
 * Update color legend based on current wealth mode
 */
function updateColorLegend() {
    const legend = d3.select('#map-legend');

    // Remove existing color legend
    legend.selectAll('.color-legend').remove();

    const wealthClasses = currentWealthMode === 'subjective' ? SUBJECTIVE_CLASSES : OBJECTIVE_CLASSES;

    const colorLegend = legend.append('div')
        .attr('class', 'color-legend')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('gap', '8px')
        .style('margin-bottom', '10px');

    Object.entries(wealthClasses).forEach(([className, color]) => {
        const item = colorLegend.append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '4px');

        item.append('div')
            .style('width', '20px')
            .style('height', '20px')
            .style('background-color', color)
            .style('border', '1px solid #ccc')
            .style('opacity', '0.6');

        item.append('span')
            .style('font-size', '0.85em')
            .text(className);
    });
}

/**
 * Switch between subjective and objective wealth mode
 * @param {string} mode - 'subjective' or 'objective'
 */
function switchWealthMode(mode) {
    if (currentWealthMode === mode) return;

    currentWealthMode = mode;
    console.log('Switched to', mode, 'wealth mode');

    // Update button states
    d3.select('#btn-subjective')
        .style('background-color', mode === 'subjective' ? '#e74c3c' : '#3498db');
    d3.select('#btn-objective')
        .style('background-color', mode === 'objective' ? '#e74c3c' : '#3498db');

    // Update color legend
    updateColorLegend();

    // Re-render grid with new mode
    createGridOverlay();
}

/**
 * Toggle grid visibility
 */
function toggleGrid() {
    const grid = mapSvg.select('.grid-overlay');
    const button = d3.select('#grid-toggle');

    if (grid.style('display') === 'none') {
        grid.style('display', null);
        button.text('🔲 隱藏網格');
    } else {
        grid.style('display', 'none');
        button.text('🔳 顯示網格');
    }
}

/**
 * Load map data for a specific year
 * @param {string} year - Year to load data for
 */
function loadMapData(year) {
    console.log(`Loading map data for year ${year}...`);
    currentYear = year;

    // Load grid visualization data
    d3.json(`data/processed/grid_viz_data_${year}.json`).then(data => {
        gridVizData = data;
        console.log(`Loaded grid data for ${year}:`, data.total_samples, 'samples,', Object.keys(data.zip_codes).length, 'ZIP codes');

        // Re-render grid with new data
        createGridOverlay();
    }).catch(error => {
        console.error('Error loading grid visualization data:', error);
        gridVizData = null;
    });
}

/**
 * Update map visualization with data
 * @param {Object} data - Geographic data
 */
function updateMapWithData(data) {
    console.log('Updating map with data:', data);
    // Implementation will be added when geo_data files are available

    // This function will:
    // 1. Color regions based on wealth metrics
    // 2. Update tooltips with statistical information
    // 3. Create data-driven legend
}

/**
 * Create grid overlay on the map with data visualization
 * @param {number} gridSize - Size of grid squares in pixels (default 150px)
 */
function createGridOverlay(gridSize = 75) {
    const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    console.log(`\n🔄 [${timestamp}] ======== CREATE GRID OVERLAY ========`);
    console.log(`📐 Grid size: ${gridSize}px`);
    console.log(`📊 Data available: ${gridVizData ? 'YES' : 'NO'}`);
    console.log(`🗺️  Current zoom: ${currentZoom.toFixed(2)} (${currentZoom > 3 ? 'TOWN' : 'COUNTY'} level)`);
    console.log(`💰 Wealth mode: ${currentWealthMode}`);
    console.log(`🔀 Transform: x=${currentTransform.x.toFixed(1)}, y=${currentTransform.y.toFixed(1)}, k=${currentTransform.k.toFixed(2)}`);

    // Get map container dimensions
    const container = document.getElementById('map-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Remove existing grid if any
    const existingGrid = mapSvg.selectAll('.grid-overlay');
    if (!existingGrid.empty()) {
        console.log(`🗑️  Removing existing grid (${existingGrid.size()} elements)`);
    }
    mapSvg.selectAll('.grid-overlay').remove();

    // Create grid group (layered ABOVE map, not affected by zoom)
    const gridGroup = mapSvg.append('g')
        .attr('class', 'grid-overlay')
        .style('pointer-events', 'all'); // Allow interaction with grid

    // Calculate number of grid cells needed
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);

    console.log(`📏 Container: ${width}px × ${height}px`);
    console.log(`🔲 Grid dimensions: ${cols} columns × ${rows} rows = ${cols * rows} total cells`);

    let cellsWithData = 0;

    // Create grid cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * gridSize;
            const y = row * gridSize;

            // Create cell group
            const cellGroup = gridGroup.append('g')
                .attr('class', 'grid-cell')
                .attr('transform', `translate(${x}, ${y})`)
                .attr('data-row', row)
                .attr('data-col', col);

            // Add cell border
            cellGroup.append('rect')
                .attr('class', 'grid-cell-border')
                .attr('width', gridSize)
                .attr('height', gridSize)
                .attr('fill', 'none')
                .attr('stroke', '#95a5a6')
                .attr('stroke-width', 0.5)
                .attr('stroke-opacity', 0.3);

            // Get data for this cell (aggregate from intersecting regions)
            const cellData = getDataForGridCell(x, y, gridSize, gridSize);

            // Render bar chart if we have data
            if (cellData && hasData(cellData)) {
                renderBarChartInCell(cellGroup, cellData, gridSize);
                cellsWithData++;
            }
        }
    }

    console.log(`✅ Created ${cols * rows} grid cells (${cellsWithData} with data, ${cols * rows - cellsWithData} empty)`);
    console.log(`======================================\n`);
}

/**
 * Get data for a grid cell by finding intersecting regions
 * @param {number} x - Cell X position in pixels
 * @param {number} y - Cell Y position in pixels
 * @param {number} w - Cell width
 * @param {number} h - Cell height
 * @returns {Object} Aggregated data for the cell
 */
function getDataForGridCell(x, y, w, h) {
    if (!gridVizData || !countyData) return null;

    // Apply inverse transform to screen coordinates to get map coordinates
    // Then convert to geographic coordinates
    const invertTransform = (screenX, screenY) => {
        // Apply inverse of current transform: (screen - translate) / scale
        const mapX = (screenX - currentTransform.x) / currentTransform.k;
        const mapY = (screenY - currentTransform.y) / currentTransform.k;
        return projection.invert([mapX, mapY]);
    };

    // Convert cell corners to geographic coordinates (accounting for current zoom/pan)
    const topLeft = invertTransform(x, y);
    const topRight = invertTransform(x + w, y);
    const bottomLeft = invertTransform(x, y + h);
    const bottomRight = invertTransform(x + w, y + h);
    const center = invertTransform(x + w/2, y + h/2);

    // Find all features that might intersect this cell
    const geoData = currentZoom > 3 ? townData : countyData;
    if (!geoData) return null;

    const intersectingRegions = new Set();

    // Check if cell center is inside any region
    for (const feature of geoData.features) {
        if (isPointInFeature(center, feature)) {
            const regionName = getRegionName(feature);
            intersectingRegions.add(regionName);
            break; // Center can only be in one region
        }
    }

    // If no intersection found at center, check corners
    if (intersectingRegions.size === 0) {
        const corners = [topLeft, topRight, bottomLeft, bottomRight];
        for (const corner of corners) {
            for (const feature of geoData.features) {
                if (isPointInFeature(corner, feature)) {
                    const regionName = getRegionName(feature);
                    intersectingRegions.add(regionName);
                }
            }
        }
    }

    // Aggregate data from all intersecting regions
    return aggregateDataFromRegions(Array.from(intersectingRegions));
}

/**
 * Check if a point is inside a feature
 * @param {Array} point - [lon, lat]
 * @param {Object} feature - GeoJSON feature
 * @returns {boolean}
 */
function isPointInFeature(point, feature) {
    if (!point || !feature) return false;

    const path = d3.geoPath().projection(null);
    const projected = projection(point);

    if (!projected) return false;

    // Use d3.geoContains for geographic containment
    return d3.geoContains(feature, point);
}

/**
 * Get region name from feature properties
 * @param {Object} feature - GeoJSON feature
 * @returns {string} Region name (鄉鎮市區 for TOWN level, 縣市 for COUNTY level)
 */
function getRegionName(feature) {
    const props = feature.properties;

    // For TOWN level, return town name (e.g., "中正區", "板橋區")
    if (props.TOWNNAME) {
        return props.TOWNNAME;
    }

    // For COUNTY level, return county name (e.g., "台北市", "新北市")
    if (props.COUNTYNAME) {
        return props.COUNTYNAME;
    }

    // Fallback
    return props.NAME || '未知';
}

/**
 * Aggregate data from multiple regions
 * @param {Array} regionNames - Array of region names from GeoJSON
 * @returns {Object} Aggregated data
 *
 * Matching logic:
 * - COUNTY level: regionNames = ["台北市"], matches "台北市中正區", "台北市大同區", etc.
 * - TOWN level: regionNames = ["中正區"], matches "台北市中正區"
 */
function aggregateDataFromRegions(regionNames) {
    if (!gridVizData || regionNames.length === 0) return null;

    const aggregated = {
        subjective: {},
        objective: {},
        regions: regionNames
    };

    // Initialize age groups
    AGE_GROUPS.forEach(age => {
        aggregated.subjective[age] = {};
        aggregated.objective[age] = {};
    });

    // Determine if we're at TOWN or COUNTY level based on region names
    // COUNTY names (直轄市/縣): 台北市, 新北市, 桃園市, 台中市, 台南市, 高雄市, 新竹縣, 苗栗縣, etc.
    // TOWN names (鄉/鎮/市/區): 中正區, 板橋區, 中壢區, 三峽區, etc.
    // Note: Use length check to distinguish - county names are typically longer (3+ chars)
    const isCountyLevel = regionNames.some(name => {
        // Check if it's a county/municipality (直轄市 or 縣)
        // Direct municipalities: 台北市, 新北市, 桃園市, 台中市, 台南市, 高雄市
        // Counties: ends with 縣 and length >= 3
        return (name.endsWith('縣')) ||
               (name.endsWith('市') && name.length >= 3 &&
                ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '基隆市', '新竹市', '嘉義市'].includes(name));
    });

    console.log(`Aggregating data for regions:`, regionNames, `(${isCountyLevel ? 'COUNTY' : 'TOWN'} level)`);

    // Aggregate data from all ZIP codes that match the region names
    for (const [zipCode, zipData] of Object.entries(gridVizData.zip_codes)) {
        if (!zipData.region) continue;

        let matchesRegion = false;

        if (isCountyLevel) {
            // COUNTY level: Check if ZIP region starts with any county name
            // e.g., "台北市中正區" starts with "台北市"
            matchesRegion = regionNames.some(countyName =>
                zipData.region.startsWith(countyName)
            );
        } else {
            // TOWN level: Check if ZIP region ends with any town name
            // e.g., "台北市中正區" ends with "中正區"
            matchesRegion = regionNames.some(townName =>
                zipData.region.endsWith(townName)
            );
        }

        if (matchesRegion) {
            // Aggregate subjective data
            for (const [age, wealthDist] of Object.entries(zipData.subjective || {})) {
                if (!aggregated.subjective[age]) aggregated.subjective[age] = {};
                for (const [wealthClass, count] of Object.entries(wealthDist)) {
                    aggregated.subjective[age][wealthClass] =
                        (aggregated.subjective[age][wealthClass] || 0) + count;
                }
            }

            // Aggregate objective data
            for (const [age, wealthDist] of Object.entries(zipData.objective || {})) {
                if (!aggregated.objective[age]) aggregated.objective[age] = {};
                for (const [wealthClass, count] of Object.entries(wealthDist)) {
                    aggregated.objective[age][wealthClass] =
                        (aggregated.objective[age][wealthClass] || 0) + count;
                }
            }
        }
    }

    return aggregated;
}

/**
 * Check if cell data has any actual values
 * @param {Object} cellData - Cell data
 * @returns {boolean}
 */
function hasData(cellData) {
    if (!cellData) return false;

    const dataSource = currentWealthMode === 'subjective' ? cellData.subjective : cellData.objective;

    for (const ageData of Object.values(dataSource)) {
        if (Object.keys(ageData).length > 0) {
            return true;
        }
    }

    return false;
}

/**
 * Render 100% stacked horizontal bar chart in a grid cell
 * @param {Object} cellGroup - D3 selection of cell group
 * @param {Object} cellData - Aggregated data for the cell
 * @param {number} gridSize - Size of grid cell
 */
function renderBarChartInCell(cellGroup, cellData, gridSize) {
    const wealthClasses = currentWealthMode === 'subjective' ? SUBJECTIVE_CLASSES : OBJECTIVE_CLASSES;
    const dataSource = currentWealthMode === 'subjective' ? cellData.subjective : cellData.objective;

    const BAR_PADDING = 2;
    const barHeight = (gridSize - (AGE_GROUPS.length + 1) * BAR_PADDING) / AGE_GROUPS.length;

    AGE_GROUPS.forEach((ageGroup, ageIndex) => {
        const distribution = dataSource[ageGroup];
        if (!distribution) return;

        // Calculate total for normalization
        const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
        if (total === 0) return;

        // Create bar group
        const barGroup = cellGroup.append('g')
            .attr('class', 'age-bar-group')
            .attr('transform', `translate(${BAR_PADDING}, ${BAR_PADDING + ageIndex * (barHeight + BAR_PADDING)})`);

        // Create stacked segments
        let xOffset = 0;
        Object.entries(wealthClasses).forEach(([wealthClass, color]) => {
            const count = distribution[wealthClass] || 0;
            const percentage = count / total;
            const segmentWidth = percentage * (gridSize - 2 * BAR_PADDING);

            if (segmentWidth > 0) {
                barGroup.append('rect')
                    .attr('class', 'age-bar')
                    .attr('x', xOffset)
                    .attr('y', 0)
                    .attr('width', segmentWidth)
                    .attr('height', barHeight)
                    .attr('fill', color)
                    .attr('opacity', 0.6)
                    .on('mouseover', function(event) {
                        d3.select(this).attr('opacity', 0.8);
                        showTooltip(
                            `年齡層: ${ageGroup}<br/>` +
                            `${currentWealthMode === 'subjective' ? '主觀' : '客觀'}財富: ${wealthClass}<br/>` +
                            `人數: ${count}<br/>` +
                            `比例: ${(percentage * 100).toFixed(1)}%`,
                            event.pageX,
                            event.pageY
                        );
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('opacity', 0.6);
                        hideTooltip();
                    });

                xOffset += segmentWidth;
            }
        });
    });
}

// Export functions
window.initializeMap = initializeMap;

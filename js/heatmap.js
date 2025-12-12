/**
 * Heatmap visualization for wealth perception analysis
 * Y-axis: Objective wealth levels (低, 中低, 中等, 中高, 高)
 * X-axis: Survey years (1992-2022)
 * Color: Average subjective wealth score
 */

console.log('[HEATMAP] heatmap.js loaded');

// Color scale for perception gap (difference between subjective and objective)
// Blue = small gap (accurate perception), Red = large gap (perception bias)
const HEATMAP_COLOR_SCALE = d3.scaleSequential()
    .domain([0, 3]) // Perception gap: 0 (accurate) to 3 (maximum difference)
    .interpolator(d3.interpolateRdYlBu)
    .unknown('#f0f0f0');

// Reverse the color scale so blue = small gap, red = large gap
const HEATMAP_COLOR_SCALE_REVERSED = (value) => {
    return HEATMAP_COLOR_SCALE(3 - value); // Reverse the scale
};

// Objective wealth categories (Y-axis)
const OBJECTIVE_CATEGORIES = ['低', '中低', '中等', '中高', '高'];

// Survey years (X-axis)
const YEARS = [1992, 1997, 2002, 2007, 2012, 2017, 2022];

// Mapping from subjective class names to numeric scores (1-6)
const SUBJECTIVE_TO_SCORE = {
    '下層階級': 1,
    '勞工階級': 2,
    '中下層階級': 3,
    '中層階級': 4,
    '中上層階級': 5,
    '上層階級': 6
};

// Mapping from objective wealth categories to numeric scores (1-5)
const OBJECTIVE_TO_SCORE = {
    '低': 1,
    '中低': 2,
    '中等': 3,
    '中高': 4,
    '高': 5
};

/**
 * Initialize and render the heatmap
 */
function initializeHeatmap() {
    console.log('[HEATMAP] Initializing heatmap...');
    console.log('[HEATMAP] YEARS array:', YEARS);

    const container = document.getElementById('heatmap-container');
    console.log('[HEATMAP] Container element:', container);

    if (!container) {
        console.error('[HEATMAP] ERROR: Heatmap container not found');
        return;
    }

    // Show loading message
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #7f8c8d;">載入中...</p>';
    console.log('[HEATMAP] Loading message displayed');

    // Load all year data
    const dataPromises = YEARS.map(year => {
        const path = `data/processed/wealth_data_${year}.json`;
        console.log(`[HEATMAP] Loading data from: ${path}`);

        return d3.json(path)
            .then(data => {
                console.log(`[HEATMAP] Successfully loaded ${year}:`, data);
                return { year, data };
            })
            .catch(error => {
                console.error(`[HEATMAP] Error loading data for ${year}:`, error);
                return { year, data: null };
            });
    });

    console.log('[HEATMAP] Waiting for all data promises...');

    Promise.all(dataPromises)
        .then(yearDataArray => {
            console.log('[HEATMAP] All data loaded:', yearDataArray);

            // Process data and create heatmap
            const heatmapData = processHeatmapData(yearDataArray);
            console.log('[HEATMAP] Processed heatmap data:', heatmapData);

            renderHeatmap(container, heatmapData);
        })
        .catch(error => {
            console.error('[HEATMAP] Error loading heatmap data:', error);
            container.innerHTML = `<p style="text-align: center; padding: 40px; color: #e74c3c;">載入失敗：${error.message}</p>`;
        });
}

/**
 * Process loaded data into heatmap format
 * @param {Array} yearDataArray - Array of {year, data} objects
 * @returns {Array} Heatmap data with format [{year, objective, subjective_avg, count}, ...]
 */
function processHeatmapData(yearDataArray) {
    console.log('[HEATMAP] Processing data...');
    const heatmapData = [];

    yearDataArray.forEach(({ year, data }) => {
        console.log(`[HEATMAP] Processing year ${year}:`, data);

        if (!data) {
            console.warn(`[HEATMAP] No data object for year ${year}`);
            return;
        }

        if (!data.links) {
            console.warn(`[HEATMAP] No links in data for year ${year}. Available keys:`, Object.keys(data));
            return;
        }

        console.log(`[HEATMAP] ${year} has ${data.links.length} links`);

        // Group links by objective wealth and accumulate weighted subjective scores
        const objectiveGroups = {};
        OBJECTIVE_CATEGORIES.forEach(cat => {
            objectiveGroups[cat] = {
                totalScore: 0,
                totalCount: 0
            };
        });

        data.links.forEach((link, idx) => {
            if (idx < 3) {
                console.log(`[HEATMAP] Sample link ${idx} for ${year}:`, link);
            }

            const objective = link.target; // target is the objective wealth
            const subjective = link.source; // source is the subjective class
            const count = link.value; // number of samples

            if (objective && subjective && count > 0) {
                if (objectiveGroups[objective]) {
                    const score = SUBJECTIVE_TO_SCORE[subjective];
                    if (score) {
                        // Accumulate weighted scores
                        objectiveGroups[objective].totalScore += score * count;
                        objectiveGroups[objective].totalCount += count;
                    } else {
                        if (idx < 3) console.warn(`[HEATMAP] Unknown subjective class: ${subjective}`);
                    }
                } else {
                    if (idx < 3) console.warn(`[HEATMAP] Unknown objective category: ${objective}`);
                }
            }
        });

        console.log(`[HEATMAP] ${year} objective groups:`, Object.keys(objectiveGroups).map(k => `${k}: ${objectiveGroups[k].totalCount} samples`));

        // Calculate average subjective score and perception gap for each objective category
        OBJECTIVE_CATEGORIES.forEach(objective => {
            const group = objectiveGroups[objective];
            if (group.totalCount > 0) {
                const subjectiveAvg = group.totalScore / group.totalCount;

                // Calculate perception gap (absolute difference between subjective and objective)
                // Normalize both to comparable scales:
                // Subjective: 1-6 scale → normalize to 1-5 scale by mapping (x-1)*5/5+1 = x
                // We need to map subjective 1-6 to comparable objective 1-5
                const normalizedSubjective = (subjectiveAvg - 1) * (4 / 5) + 1; // Map 1-6 to 1-5
                const objectiveScore = OBJECTIVE_TO_SCORE[objective];
                const perceptionGap = Math.abs(normalizedSubjective - objectiveScore);

                heatmapData.push({
                    year: year,
                    objective: objective,
                    subjective_avg: subjectiveAvg,
                    perception_gap: perceptionGap,
                    count: group.totalCount
                });
                console.log(`[HEATMAP] ${year} - ${objective}: subjective_avg=${subjectiveAvg.toFixed(2)}, perception_gap=${perceptionGap.toFixed(2)}, count=${group.totalCount}`);
            } else {
                // No data for this cell
                heatmapData.push({
                    year: year,
                    objective: objective,
                    subjective_avg: null,
                    perception_gap: null,
                    count: 0
                });
                console.log(`[HEATMAP] ${year} - ${objective}: NO DATA`);
            }
        });
    });

    console.log(`[HEATMAP] Total heatmap cells: ${heatmapData.length}`);
    return heatmapData;
}

/**
 * Render the heatmap visualization
 * @param {HTMLElement} container - Container element
 * @param {Array} data - Processed heatmap data
 */
function renderHeatmap(container, data) {
    console.log('[HEATMAP] Rendering heatmap with data:', data);
    console.log('[HEATMAP] Container:', container);

    // Clear container
    container.innerHTML = '';

    // Set up dimensions
    const margin = { top: 80, right: 120, bottom: 80, left: 120 };
    const cellWidth = 80;
    const cellHeight = 60;
    const width = YEARS.length * cellWidth;
    const height = OBJECTIVE_CATEGORIES.length * cellHeight;

    console.log(`[HEATMAP] Dimensions: width=${width}, height=${height}, cellWidth=${cellWidth}, cellHeight=${cellHeight}`);

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (years)
    const xScale = d3.scaleBand()
        .domain(YEARS)
        .range([0, width])
        .padding(0.05);

    // Y scale (objective wealth - reversed to show 高 at top)
    const yScale = d3.scaleBand()
        .domain(OBJECTIVE_CATEGORIES.slice().reverse())
        .range([0, height])
        .padding(0.05);

    // Create cells
    const cells = svg.selectAll('.heatmap-cell')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'heatmap-cell')
        .attr('transform', d => `translate(${xScale(d.year)},${yScale(d.objective)})`);

    // Add rectangles
    cells.append('rect')
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => {
            if (d.subjective_avg === null || d.count === 0) {
                return '#f0f0f0'; // No data
            }
            // Use perception gap for color: blue = small gap, red = large gap
            return HEATMAP_COLOR_SCALE_REVERSED(d.perception_gap);
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke', '#2c3e50')
                .attr('stroke-width', 3);

            if (d.subjective_avg !== null) {
                // Calculate perception direction
                const objectiveScore = OBJECTIVE_TO_SCORE[d.objective];
                const normalizedSubjective = (d.subjective_avg - 1) * (4 / 5) + 1;
                const direction = normalizedSubjective > objectiveScore ? '高估' :
                                 normalizedSubjective < objectiveScore ? '低估' : '相符';

                showTooltip(
                    `<strong>${d.year}年 - 客觀財富：${d.objective}</strong><br/>` +
                    `平均主觀階層: ${d.subjective_avg.toFixed(2)}<br/>` +
                    `認知差異: ${d.perception_gap.toFixed(2)} (${direction})<br/>` +
                    `樣本數: ${d.count.toLocaleString()}`,
                    event.pageX,
                    event.pageY
                );
            } else {
                showTooltip(
                    `<strong>${d.year}年 - ${d.objective}</strong><br/>無資料`,
                    event.pageX,
                    event.pageY
                );
            }
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2);
            hideTooltip();
        });

    // Add text labels showing average subjective scores
    cells.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', d => {
            if (d.subjective_avg === null) return '#999';
            // Choose text color based on background color (perception gap)
            // Blue backgrounds (small gap) need dark text, red backgrounds (large gap) need light text
            return d.perception_gap < 1.5 ? '#2c3e50' : '#ffffff';
        })
        .text(d => d.subjective_avg !== null ? d.subjective_avg.toFixed(2) : 'N/A')
        .style('pointer-events', 'none');

    // Add X axis (years)
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('font-size', '14px')
        .attr('font-weight', '500');

    // Add Y axis (objective wealth)
    svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('font-size', '14px')
        .attr('font-weight', '500');

    // Add axis labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('調查年度');

    svg.append('text')
        .attr('x', -height / 2)
        .attr('y', -70)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('客觀財富等級');

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('客觀財富群體的平均主觀階層認同');

    // Add color legend
    addColorLegend(svg, width, height);

    console.log('Heatmap rendered successfully');
}

/**
 * Add color legend to the heatmap
 * @param {Object} svg - D3 SVG selection
 * @param {number} width - Chart width
 * @param {number} height - Chart height
 */
function addColorLegend(svg, width, height) {
    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = width + 40;
    const legendY = (height - legendHeight) / 2;

    // Create gradient for perception gap (reversed scale)
    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
        .attr('id', 'heatmap-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');

    // Add gradient stops for perception gap (0 = blue, 3 = red)
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const value = (3 / steps) * i; // 0 to 3
        linearGradient.append('stop')
            .attr('offset', `${(i / steps) * 100}%`)
            .attr('stop-color', HEATMAP_COLOR_SCALE_REVERSED(value));
    }

    // Draw legend rectangle
    svg.append('rect')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#heatmap-gradient)')
        .attr('stroke', '#2c3e50')
        .attr('stroke-width', 1);

    // Add legend scale (0 = blue/accurate, 3 = red/biased)
    const legendScale = d3.scaleLinear()
        .domain([0, 3])
        .range([legendY + legendHeight, legendY]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(4)
        .tickFormat(d => {
            const labels = {
                0: '相符',
                1: '小差異',
                2: '中差異',
                3: '大差異'
            };
            return labels[d] || d.toFixed(1);
        });

    svg.append('g')
        .attr('class', 'legend-axis')
        .attr('transform', `translate(${legendX + legendWidth},0)`)
        .call(legendAxis)
        .selectAll('text')
        .attr('font-size', '11px');

    // Add legend title
    svg.append('text')
        .attr('x', legendX + legendWidth / 2)
        .attr('y', legendY - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('認知差異');
}

// Export function
window.initializeHeatmap = initializeHeatmap;

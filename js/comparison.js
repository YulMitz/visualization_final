/**
 * Comparison chart visualization
 * Shows trends of subjective wealth, objective wealth, and happiness over 30 years
 */

/**
 * Initialize the comparison chart
 */
function initializeComparisonChart() {
    console.log('Initializing comparison chart...');

    // Load comparison data
    d3.json('data/processed/comparison_data.json')
        .then(data => {
            renderComparisonChart(data);
        })
        .catch(error => {
            console.error('Error loading comparison data:', error);
            const container = document.getElementById('comparison-chart-container');
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #e74c3c;">
                    <div style="text-align: center;">
                        <p style="font-size: 1.2em; margin-bottom: 10px;">⚠️ 無法載入比較資料</p>
                        <p style="font-size: 0.95em; color: #7f8c8d;">請確認資料檔案是否存在</p>
                    </div>
                </div>
            `;
        });
}

/**
 * Render the comparison line chart
 * @param {Object} data - Data object with years, subjective_avg, objective_avg, happiness_avg
 */
function renderComparisonChart(data) {
    console.log('Rendering comparison chart with data:', data);

    const container = document.getElementById('comparison-chart-container');
    const width = container.clientWidth - 40; // Account for padding
    const height = container.clientHeight - 40;

    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear existing content
    container.innerHTML = '';

    // Create SVG
    const svg = d3.select('#comparison-chart-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scalePoint()
        .domain(data.years)
        .range([0, innerWidth])
        .padding(0.5);

    const yScaleLeft = d3.scaleLinear()
        .domain([0, 1])
        .range([innerHeight, 0])
        .nice();

    // Calculate happiness scale domain (excluding null values)
    const happinessValues = data.happiness_avg.filter(v => v !== null);
    const happinessMin = d3.min(happinessValues);
    const happinessMax = d3.max(happinessValues);
    const happinessPadding = (happinessMax - happinessMin) * 0.1;

    const yScaleRight = d3.scaleLinear()
        .domain([happinessMin - happinessPadding, happinessMax + happinessPadding])
        .range([innerHeight, 0])
        .nice();

    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => d.toString());

    const yAxisLeft = d3.axisLeft(yScaleLeft)
        .ticks(10)
        .tickFormat(d => d.toFixed(1));

    const yAxisRight = d3.axisRight(yScaleRight)
        .ticks(10)
        .tickFormat(d => d.toFixed(1));

    // Add gridlines
    g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScaleLeft)
            .ticks(10)
            .tickSize(-innerWidth)
            .tickFormat(''));

    // Add X axis
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .style('font-size', '13px')
        .style('font-weight', '600');

    // Add left Y axis
    g.append('g')
        .attr('class', 'y-axis-left')
        .call(yAxisLeft)
        .selectAll('text')
        .style('font-size', '12px');

    // Add right Y axis
    g.append('g')
        .attr('class', 'y-axis-right')
        .attr('transform', `translate(${innerWidth}, 0)`)
        .call(yAxisRight)
        .selectAll('text')
        .style('font-size', '12px');

    // Add axis labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#2c3e50')
        .text('財富指標（標準化分數）');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', innerWidth + 60)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#2c3e50')
        .text('平均幸福感');

    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#2c3e50')
        .text('年度');

    // Define line generators
    const lineSubjective = d3.line()
        .x((d, i) => xScale(data.years[i]))
        .y(d => yScaleLeft(d))
        .curve(d3.curveMonotoneX);

    const lineObjective = d3.line()
        .x((d, i) => xScale(data.years[i]))
        .y(d => yScaleLeft(d))
        .curve(d3.curveMonotoneX);

    const lineHappiness = d3.line()
        .defined(d => d !== null)
        .x((d, i) => xScale(data.years[i]))
        .y(d => yScaleRight(d))
        .curve(d3.curveMonotoneX);

    // Color scheme
    const colors = {
        subjective: '#e74c3c',
        objective: '#3498db',
        happiness: '#2ecc71'
    };

    // Add lines
    g.append('path')
        .datum(data.subjective_avg)
        .attr('class', 'line-subjective')
        .attr('fill', 'none')
        .attr('stroke', colors.subjective)
        .attr('stroke-width', 3)
        .attr('d', lineSubjective);

    g.append('path')
        .datum(data.objective_avg)
        .attr('class', 'line-objective')
        .attr('fill', 'none')
        .attr('stroke', colors.objective)
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8,4')
        .attr('d', lineObjective);

    g.append('path')
        .datum(data.happiness_avg)
        .attr('class', 'line-happiness')
        .attr('fill', 'none')
        .attr('stroke', colors.happiness)
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '4,4')
        .attr('d', lineHappiness);

    // Add data points for subjective wealth
    g.selectAll('.dot-subjective')
        .data(data.subjective_avg)
        .enter()
        .append('circle')
        .attr('class', 'dot-subjective')
        .attr('cx', (d, i) => xScale(data.years[i]))
        .attr('cy', d => yScaleLeft(d))
        .attr('r', 5)
        .attr('fill', colors.subjective)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 7);
            const i = data.subjective_avg.indexOf(d);
            const tooltipContent = `
                <strong>${data.years[i]} 年</strong><br/>
                主觀財富: ${d.toFixed(3)}<br/>
                客觀財富: ${data.objective_avg[i].toFixed(3)}<br/>
                ${data.happiness_avg[i] !== null ? `幸福感: ${data.happiness_avg[i].toFixed(2)}` : ''}
            `;
            showTooltip(tooltipContent, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this).attr('r', 5);
            hideTooltip();
        });

    // Add data points for objective wealth
    g.selectAll('.dot-objective')
        .data(data.objective_avg)
        .enter()
        .append('circle')
        .attr('class', 'dot-objective')
        .attr('cx', (d, i) => xScale(data.years[i]))
        .attr('cy', d => yScaleLeft(d))
        .attr('r', 5)
        .attr('fill', colors.objective)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 7);
            const i = data.objective_avg.indexOf(d);
            const tooltipContent = `
                <strong>${data.years[i]} 年</strong><br/>
                主觀財富: ${data.subjective_avg[i].toFixed(3)}<br/>
                客觀財富: ${d.toFixed(3)}<br/>
                ${data.happiness_avg[i] !== null ? `幸福感: ${data.happiness_avg[i].toFixed(2)}` : ''}
            `;
            showTooltip(tooltipContent, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this).attr('r', 5);
            hideTooltip();
        });

    // Add data points for happiness
    // Create array with year index preserved
    const happinessData = data.happiness_avg.map((value, index) => ({
        value: value,
        year: data.years[index],
        yearIndex: index
    })).filter(d => d.value !== null);

    g.selectAll('.dot-happiness')
        .data(happinessData)
        .enter()
        .append('circle')
        .attr('class', 'dot-happiness')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScaleRight(d.value))
        .attr('r', 5)
        .attr('fill', colors.happiness)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 7);
            const tooltipContent = `
                <strong>${d.year} 年</strong><br/>
                主觀財富: ${data.subjective_avg[d.yearIndex].toFixed(3)}<br/>
                客觀財富: ${data.objective_avg[d.yearIndex].toFixed(3)}<br/>
                幸福感: ${d.value.toFixed(2)}
            `;
            showTooltip(tooltipContent, event.pageX, event.pageY);
        })
        .on('mouseout', function() {
            d3.select(this).attr('r', 5);
            hideTooltip();
        });

    // Create legend
    const legendData = [
        { label: '主觀財富（標準化）', color: colors.subjective, dash: '' },
        { label: '客觀財富（標準化）', color: colors.objective, dash: '8,4' },
        { label: '平均幸福感', color: colors.happiness, dash: '4,4' }
    ];

    const legend = d3.select('#comparison-legend');
    legend.html('');

    const legendSvg = legend.append('svg')
        .attr('width', '100%')
        .attr('height', 80);

    const legendGroup = legendSvg.append('g')
        .attr('transform', 'translate(20, 20)');

    legendData.forEach((item, i) => {
        const yPos = i * 25;

        legendGroup.append('line')
            .attr('x1', 0)
            .attr('y1', yPos)
            .attr('x2', 40)
            .attr('y2', yPos)
            .attr('stroke', item.color)
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', item.dash);

        legendGroup.append('circle')
            .attr('cx', 20)
            .attr('cy', yPos)
            .attr('r', 5)
            .attr('fill', item.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        legendGroup.append('text')
            .attr('x', 50)
            .attr('y', yPos)
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('fill', '#2c3e50')
            .text(item.label);
    });

    console.log('Comparison chart rendered successfully');
}

// Export functions
window.initializeComparisonChart = initializeComparisonChart;

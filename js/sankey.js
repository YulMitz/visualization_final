/**
 * Animated Sankey diagram visualization for wealth flow analysis
 * Shows the relationship between subjective and objective wealth classes
 * with particle-based flow animation
 */

// Color schemes matching geographical.js
const SUBJECTIVE_COLORS = {
    '下層階級': '#a08080',      // 暗紅褐
    '勞工階級': '#c89090',      // 淺紅褐
    '中下層階級': '#d4b896',    // 淺黃褐
    '中層階級': '#9db7c4',      // 淺藍灰
    '中上層階級': '#a8c4a8',    // 淺綠灰
    '上層階級': '#789078'       // 暗綠灰
};

const OBJECTIVE_COLORS = {
    '低': '#a08080',            // 暗紅褐
    '中低': '#c89090',          // 淺紅褐
    '中等': '#d4b896',          // 淺黃褐
    '中高': '#a8c4a8',          // 淺綠灰
    '高': '#789078'             // 暗綠灰
};

// Class order for sequential animation (correct social hierarchy order)
const CLASS_ORDER = ['下層階級', '勞工階級', '中下層階級', '中層階級', '中上層階級', '上層階級'];

// Animation state - use object per year to avoid conflicts
const animationStates = {};

/**
 * Convert color to lighter, less saturated version for particles
 * @param {string} hexColor - Hex color string (e.g., '#a08080')
 * @returns {string} Modified hex color
 */
function lightenAndDesaturateColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Convert RGB to HSL
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
            case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
            case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
        }
    }

    // Reduce saturation by 15% and increase lightness by 10%
    s = Math.max(0, s * 0.85);
    l = Math.min(1, l + 0.1);

    // Convert HSL back to RGB
    let r2, g2, b2;

    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r2 = hue2rgb(p, q, h + 1/3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1/3);
    }

    // Convert back to hex
    const toHex = (val) => {
        const hex = Math.round(val * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

/**
 * Particle class for flow animation
 */
class Particle {
    constructor(link, pathGenerator, color, birthTime, initialProgress = 0) {
        this.link = link;
        this.pathGenerator = pathGenerator;
        this.color = lightenAndDesaturateColor(color); // Use lighter, less saturated color
        this.progress = initialProgress; // Start at random position along path
        this.speed = 1 / 3000; // Fixed speed: complete journey in 3 seconds (1/3000 per ms)
        this.opacity = 0.7 + Math.random() * 0.3;
        this.size = 2.5 + Math.random() * 1.5;
        this.birthTime = birthTime; // Track when particle was created

        // Perpendicular offset for lateral drift within path width
        this.lateralOffset = (Math.random() - 0.5); // -0.5 to 0.5, will be multiplied by path width
        this.lateralDriftSpeed = (Math.random() - 0.5) * 0.0002; // Slow drift across path width
        this.lateralPhase = Math.random() * Math.PI * 2; // Random starting phase for sine wave
    }

    update(deltaTime) {
        this.progress += this.speed * deltaTime;

        // Update lateral position with smooth oscillation (sine wave + drift)
        this.lateralPhase += deltaTime * 0.001; // Slow oscillation
        this.lateralOffset += this.lateralDriftSpeed * deltaTime;

        // Keep lateral offset within bounds (-0.5 to 0.5)
        this.lateralOffset = Math.max(-0.5, Math.min(0.5, this.lateralOffset));

        return this.progress < 1; // Return false when particle completes journey
    }

    draw(ctx) {
        if (this.progress >= 1) return;

        // Get position along path centerline
        const path = this.pathGenerator(this.link);
        const centerPoint = this.getPointAtProgress(path, this.progress);

        if (centerPoint) {
            // Calculate perpendicular offset based on path width and lateral position
            const pathWidth = Math.max(1, this.link.width); // Link width from Sankey layout

            // Get tangent vector (direction of movement) by sampling nearby points
            const tangentPoint = this.getPointAtProgress(path, Math.min(1, this.progress + 0.01));
            const dx = tangentPoint.x - centerPoint.x;
            const dy = tangentPoint.y - centerPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            // Calculate perpendicular vector (90 degrees to tangent)
            let perpX = 0, perpY = 0;
            if (length > 0) {
                perpX = -dy / length;
                perpY = dx / length;
            }

            // Apply lateral offset with sine wave oscillation for more natural movement
            const oscillation = Math.sin(this.lateralPhase) * 0.3; // Gentle wave
            const totalOffset = (this.lateralOffset + oscillation) * pathWidth * 0.4; // Use 40% of path width

            // Calculate final position
            const finalX = centerPoint.x + perpX * totalOffset;
            const finalY = centerPoint.y + perpY * totalOffset;

            // Draw particle without stroke
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity * (1 - this.progress * 0.3); // Fade out slightly as it travels

            ctx.beginPath();
            ctx.arc(finalX, finalY, this.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
        }
    }

    getPointAtProgress(pathString, progress) {
        // Parse SVG path and get point at progress
        const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempPath.setAttribute('d', pathString);
        const pathLength = tempPath.getTotalLength();
        const point = tempPath.getPointAtLength(pathLength * Math.min(1, progress));
        return { x: point.x, y: point.y };
    }
}

/**
 * Load and render animated Sankey diagram for a specific year
 * @param {string} year - Year to load (e.g., '1992', '1997')
 */
function loadAnimatedSankeyDiagram(year) {
    console.log(`Loading animated Sankey diagram for ${year}...`);

    const containerId = `sankey-${year}`;
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }

    // Show loading message
    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #7f8c8d;">載入中...</p>';

    // Load data
    d3.json(`data/processed/wealth_data_${year}.json`)
        .then(data => {
            renderAnimatedSankeyDiagram(container, data, year);
        })
        .catch(error => {
            console.error(`Error loading Sankey data for ${year}:`, error);
            container.innerHTML = `<p style="text-align: center; padding: 20px; color: #e74c3c;">載入失敗：${error.message}</p>`;
        });
}

/**
 * Render animated Sankey diagram in the specified container
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Wealth data with nodes and links
 * @param {string} year - Year label
 */
function renderAnimatedSankeyDiagram(container, data, year) {
    // Clear container
    container.innerHTML = '';

    // Stop any existing animation for this year
    if (animationStates[year]) {
        animationStates[year].isAnimating = false;
    }

    // Initialize fresh animation state for this year
    animationStates[year] = {
        particles: [],
        currentClassIndex: 0,
        classTimer: 0,
        particleDuration: 3000, // Time for particles to complete journey (3 seconds)
        waitAfterParticles: 2000, // Wait 2 seconds after last particle finishes
        isAnimating: false,
        particlesToSpawn: [], // Queue of particles to spawn
        spawnIndex: 0,
        graph: null,
        nodes: [],
        links: []
    };

    const animationState = animationStates[year];

    // Set up dimensions
    const margin = { top: 60, right: 150, bottom: 20, left: 150 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create wrapper div for layering
    const wrapper = d3.select(container)
        .append('div')
        .style('position', 'relative')
        .style('width', (width + margin.left + margin.right) + 'px')
        .style('height', (height + margin.top + margin.bottom) + 'px');

    // Create SVG layer (bottom)
    const svg = wrapper
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('position', 'absolute')
        .style('top', 0)
        .style('left', 0)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create Canvas layer (top, for particles)
    const canvas = wrapper
        .append('canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('position', 'absolute')
        .style('top', 0)
        .style('left', 0)
        .style('pointer-events', 'none')
        .node();

    const ctx = canvas.getContext('2d');
    // Translate context to match SVG
    ctx.translate(margin.left, margin.top);

    // Create Sankey generator with custom node sorting
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(15)
        .extent([[0, 0], [width, height]])
        .nodeSort((a, b) => {
            // Define sort orders
            const subjectiveOrder = ['下層階級', '勞工階級', '中下層階級', '中層階級', '中上層階級', '上層階級'];
            const objectiveOrder = ['低', '中低', '中等', '中高', '高'];

            // Check if both are subjective classes
            const aSubjIndex = subjectiveOrder.indexOf(a.name);
            const bSubjIndex = subjectiveOrder.indexOf(b.name);

            if (aSubjIndex !== -1 && bSubjIndex !== -1) {
                return aSubjIndex - bSubjIndex;
            }

            // Check if both are objective classes
            const aObjIndex = objectiveOrder.indexOf(a.name);
            const bObjIndex = objectiveOrder.indexOf(b.name);

            if (aObjIndex !== -1 && bObjIndex !== -1) {
                return aObjIndex - bObjIndex;
            }

            // If one is subjective and one is objective, subjective comes first
            if (aSubjIndex !== -1) return -1;
            if (bSubjIndex !== -1) return 1;

            return 0;
        });

    // Prepare data for d3-sankey
    const nodeSet = new Set();
    data.links.forEach(link => {
        nodeSet.add(link.source);
        nodeSet.add(link.target);
    });

    const nodes = Array.from(nodeSet).map((name, index) => ({
        name: name,
        index: index
    }));

    const nodeMap = new Map(nodes.map(n => [n.name, n.index]));

    // Convert links to use indices
    const links = data.links.map(link => ({
        source: nodeMap.get(link.source),
        target: nodeMap.get(link.target),
        value: link.value,
        sourceName: link.source,
        targetName: link.target
    }));

    // Create sankey layout
    const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // Store graph in animation state
    animationState.graph = graph;
    animationState.nodes = nodes;
    animationState.links = graph.links;

    // Add links (flows) - SVG paths
    const linkGroup = svg.append('g')
        .attr('class', 'links')
        .selectAll('.sankey-link')
        .data(graph.links)
        .enter()
        .append('path')
        .attr('class', 'sankey-link')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke', d => {
            const sourceName = nodes[d.source.index].name;
            return SUBJECTIVE_COLORS[sourceName] || '#95a5a6';
        })
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('fill', 'none')
        .attr('opacity', 0.2) // Start with low opacity
        .on('mouseover', function(event, d) {
            const sourceName = nodes[d.source.index].name;
            const targetName = nodes[d.target.index].name;
            showTooltip(
                `<strong>${sourceName}</strong> → <strong>${targetName}</strong><br/>` +
                `人數: ${d.value.toLocaleString()}<br/>` +
                `佔總樣本: ${(d.value / data.total_samples * 100).toFixed(1)}%`,
                event.pageX,
                event.pageY
            );
        })
        .on('mouseout', function() {
            hideTooltip();
        });

    // Add nodes (rectangles)
    const nodeGroup = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('.sankey-node')
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr('class', 'sankey-node');

    nodeGroup.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => {
            if (SUBJECTIVE_COLORS[d.name]) {
                return SUBJECTIVE_COLORS[d.name];
            } else {
                return OBJECTIVE_COLORS[d.name] || '#95a5a6';
            }
        })
        .attr('stroke', '#34495e')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            const isSubjective = SUBJECTIVE_COLORS[d.name];
            const category = isSubjective ? '主觀階層' : '客觀財富';
            const summary = isSubjective ? data.summary.by_subjective : data.summary.by_objective;
            const total = summary[d.name] || d.value;

            showTooltip(
                `<strong>${category}: ${d.name}</strong><br/>` +
                `總人數: ${total.toLocaleString()}<br/>` +
                `佔總樣本: ${(total / data.total_samples * 100).toFixed(1)}%`,
                event.pageX,
                event.pageY
            );
        })
        .on('mouseout', function() {
            hideTooltip();
        });

    // Add node labels
    nodeGroup.append('text')
        .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
        .attr('font-size', '13px')
        .attr('font-weight', '500')
        .attr('fill', '#2c3e50')
        .text(d => d.name);

    // Add title
    svg.append('text')
        .attr('x', -10)
        .attr('y', -35)
        .attr('text-anchor', 'start')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('主觀階層認同');

    svg.append('text')
        .attr('x', width + 10)
        .attr('y', -35)
        .attr('text-anchor', 'end')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#2c3e50')
        .text('客觀經濟地位');

    // Add current class indicator
    const classIndicator = svg.append('text')
        .attr('x', width / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', '#e74c3c')
        .text('');

    // Add summary statistics below the diagram
    const summaryDiv = d3.select(container)
        .append('div')
        .style('margin-top', '20px')
        .style('padding', '15px')
        .style('background-color', '#ecf0f1')
        .style('border-radius', '4px')
        .style('font-size', '14px');

    summaryDiv.append('p')
        .style('margin', '0 0 10px 0')
        .style('font-weight', 'bold')
        .html(`📊 ${year}年統計摘要（總樣本數: ${data.total_samples.toLocaleString()}）`);

    // Subjective distribution
    const subjectiveStats = Object.entries(data.summary.by_subjective)
        .sort((a, b) => {
            const order = CLASS_ORDER;
            return order.indexOf(a[0]) - order.indexOf(b[0]);
        })
        .map(([cls, count]) => `${cls}: ${count} (${(count / data.total_samples * 100).toFixed(1)}%)`)
        .join(' | ');

    summaryDiv.append('p')
        .style('margin', '5px 0')
        .html(`<strong>主觀階層分布:</strong> ${subjectiveStats}`);

    // Objective distribution
    const objectiveStats = Object.entries(data.summary.by_objective)
        .sort((a, b) => {
            const order = ['低', '中低', '中等', '中高', '高'];
            return order.indexOf(a[0]) - order.indexOf(b[0]);
        })
        .map(([cls, count]) => `${cls}: ${count} (${(count / data.total_samples * 100).toFixed(1)}%)`)
        .join(' | ');

    summaryDiv.append('p')
        .style('margin', '5px 0 0 0')
        .html(`<strong>客觀財富分布:</strong> ${objectiveStats}`);

    // Helper function to prepare particles for a class
    function prepareParticlesForClass(className) {
        const activeLinks = animationState.links.filter(link => {
            const sourceName = nodes[link.source.index].name;
            return sourceName === className;
        });

        const particleQueue = [];

        // Calculate total number of samples for this class
        const totalSamples = activeLinks.reduce((sum, link) => sum + link.value, 0);

        // Create exact number of particles based on link value (1 particle per sample)
        activeLinks.forEach(link => {
            const sourceName = nodes[link.source.index].name;
            const color = SUBJECTIVE_COLORS[sourceName] || '#95a5a6';

            // Create one particle for each sample in this link
            for (let i = 0; i < link.value; i++) {
                // Add randomness to spawn time while keeping within 2 second window
                // Use gaussian-like distribution by averaging multiple random values
                const randomFactor = (Math.random() + Math.random() + Math.random()) / 3; // Tends toward 0.5
                const spawnDelay = randomFactor * 2000; // Random time within 0-2000ms

                // Add random initial position along the path (0-0.3 range)
                // This creates staggered positions along the flow path
                const initialProgress = Math.random() * 0.3; // Start at random position in first 30% of path

                particleQueue.push({
                    link: link,
                    color: color,
                    spawnDelay: spawnDelay,
                    initialProgress: initialProgress
                });
            }
        });

        // Sort by spawn delay so we can spawn them in order
        particleQueue.sort((a, b) => a.spawnDelay - b.spawnDelay);

        return particleQueue;
    }

    // Start animation
    animationState.isAnimating = true;
    animationState.currentClassIndex = 0;
    animationState.classTimer = 0;
    animationState.particles = [];
    animationState.spawnIndex = 0;

    let lastTime = performance.now();

    // Initialize first class
    const firstClass = CLASS_ORDER[0];
    classIndicator.text(`當前展示：${firstClass}`);
    linkGroup.attr('opacity', d => {
        const sourceName = nodes[d.source.index].name;
        return sourceName === firstClass ? 1.0 : 0.2;
    });

    // Prepare particles for first class
    animationState.particlesToSpawn = prepareParticlesForClass(firstClass);

    function animate(currentTime) {
        if (!animationState.isAnimating) return;

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Update class timer
        animationState.classTimer += deltaTime;

        // Phase 1: Spawning particles (based on spawn delay)
        while (animationState.spawnIndex < animationState.particlesToSpawn.length) {
            const particleData = animationState.particlesToSpawn[animationState.spawnIndex];

            if (animationState.classTimer >= particleData.spawnDelay) {
                // Spawn this particle with random initial position
                animationState.particles.push(
                    new Particle(
                        particleData.link,
                        d3.sankeyLinkHorizontal(),
                        particleData.color,
                        currentTime,
                        particleData.initialProgress // Start at random position along path
                    )
                );
                animationState.spawnIndex++;
            } else {
                break; // Wait for next spawn time
            }
        }

        // Update and draw particles
        ctx.clearRect(-margin.left, -margin.top, canvas.width, canvas.height);

        animationState.particles = animationState.particles.filter(particle => {
            const alive = particle.update(deltaTime);
            if (alive) {
                particle.draw(ctx);
            }
            return alive;
        });

        // Phase 2: After all particles spawned + duration + wait time, move to next class
        const allParticlesSpawned = animationState.spawnIndex >= animationState.particlesToSpawn.length;
        const totalPhaseDuration = 2000 + animationState.particleDuration + animationState.waitAfterParticles;

        if (allParticlesSpawned && animationState.classTimer >= totalPhaseDuration) {
            // Move to next class
            animationState.classTimer = 0;
            animationState.currentClassIndex = (animationState.currentClassIndex + 1) % CLASS_ORDER.length;
            animationState.particles = []; // Clear any remaining particles
            animationState.spawnIndex = 0;

            // Prepare particles for next class
            const nextClass = CLASS_ORDER[animationState.currentClassIndex];
            animationState.particlesToSpawn = prepareParticlesForClass(nextClass);

            // Update opacity for all links
            classIndicator.text(`當前展示：${nextClass}`);

            linkGroup.transition()
                .duration(500)
                .attr('opacity', d => {
                    const sourceName = nodes[d.source.index].name;
                    return sourceName === nextClass ? 1.0 : 0.2;
                });
        }

        requestAnimationFrame(animate);
    }

    // Start animation loop
    requestAnimationFrame(animate);

    console.log(`Animated Sankey diagram for ${year} rendered successfully`);
}

// Export function for use in main.js
window.loadAnimatedSankeyDiagram = loadAnimatedSankeyDiagram;

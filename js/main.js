/**
 * Main JavaScript for Taiwan Social Change Survey Visualization
 * Handles navigation and panel switching
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[MAIN] Taiwan Social Change Survey Visualization initialized');
    console.log('[MAIN] Current URL hash:', window.location.hash);

    // Initialize navigation
    initializeNavigation();

    // Load initial panel based on URL hash or default to overview
    const initialPanel = window.location.hash.substring(1) || 'overview';
    console.log('[MAIN] Initial panel to load:', initialPanel);
    showPanel(initialPanel);

    // Update active nav link for initial panel
    updateActiveNavLinkById(initialPanel);

    console.log('[MAIN] Initialization complete');
});

/**
 * Initialize navigation event listeners
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    console.log(`[MAIN] Found ${navLinks.length} navigation links`);

    navLinks.forEach((link, index) => {
        const panelId = link.getAttribute('data-panel');
        console.log(`[MAIN] Nav link ${index}: data-panel="${panelId}"`);

        link.addEventListener('click', function(e) {
            console.log(`[MAIN] Navigation link clicked: ${panelId}`);
            e.preventDefault();

            // Get panel ID from data attribute
            const panelId = this.getAttribute('data-panel');
            console.log(`[MAIN] Panel ID from clicked link: ${panelId}`);

            // Update URL hash
            window.location.hash = panelId;

            // Show the selected panel
            showPanel(panelId);

            // Update active nav link
            updateActiveNavLink(this);
        });
    });

    // Handle dropdown toggle
    const dropdownLabel = document.querySelector('.nav-dropdown-label');
    console.log('[MAIN] Dropdown label found:', dropdownLabel);

    if (dropdownLabel) {
        dropdownLabel.addEventListener('click', function() {
            console.log('[MAIN] Dropdown label clicked');
            const dropdown = this.parentElement;
            dropdown.classList.toggle('open');
            console.log('[MAIN] Dropdown open state:', dropdown.classList.contains('open'));
        });
    }

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', function() {
        console.log('[MAIN] Hash changed to:', window.location.hash);
        const panelId = window.location.hash.substring(1) || 'overview';
        showPanel(panelId);
        updateActiveNavLinkById(panelId);
    });
}

/**
 * Show the specified panel and hide others
 * @param {string} panelId - ID of the panel to show
 */
function showPanel(panelId) {
    console.log(`[MAIN] showPanel called with panelId: ${panelId}`);

    // Hide all panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
    });

    // Show the selected panel
    const targetPanel = document.getElementById(panelId);
    console.log(`[MAIN] Target panel found:`, targetPanel);

    if (targetPanel) {
        targetPanel.classList.add('active');

        // Trigger panel-specific initialization if needed
        console.log(`[MAIN] Calling initializePanelContent for: ${panelId}`);
        initializePanelContent(panelId);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.warn(`Panel with ID "${panelId}" not found`);
    }
}

/**
 * Update active navigation link
 * @param {HTMLElement} activeLink - The link element to mark as active
 */
function updateActiveNavLink(activeLink) {
    // Remove active class from all links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    // Add active class to the clicked link
    activeLink.classList.add('active');
}

/**
 * Update active navigation link by panel ID
 * @param {string} panelId - ID of the panel
 */
function updateActiveNavLinkById(panelId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-panel') === panelId) {
            link.classList.add('active');
        }
    });
}

/**
 * Initialize panel-specific content when panel is shown
 * @param {string} panelId - ID of the panel
 */
function initializePanelContent(panelId) {
    switch(panelId) {
        case 'geographical':
            // Initialize map if not already loaded
            if (typeof initializeMap === 'function' && !window.mapInitialized) {
                initializeMap();
                window.mapInitialized = true;
            }
            break;

        case 'year-1992':
        case 'year-1997':
        case 'year-2002':
        case 'year-2007':
        case 'year-2012':
        case 'year-2017':
        case 'year-2022':
            // Initialize animated Sankey diagram for the year
            const year = panelId.split('-')[1];
            if (typeof loadAnimatedSankeyDiagram === 'function') {
                if (!window.sankeyInitialized) {
                    window.sankeyInitialized = {};
                }
                if (!window.sankeyInitialized[year]) {
                    loadAnimatedSankeyDiagram(year);
                    window.sankeyInitialized[year] = true;
                }
            }
            break;

        case 'heatmap':
            // Initialize heatmap if not already loaded
            console.log('[MAIN] Heatmap panel activated');
            console.log('[MAIN] initializeHeatmap function exists?', typeof initializeHeatmap === 'function');
            console.log('[MAIN] heatmapInitialized?', window.heatmapInitialized);

            if (typeof initializeHeatmap === 'function' && !window.heatmapInitialized) {
                console.log('[MAIN] Calling initializeHeatmap()');
                initializeHeatmap();
                window.heatmapInitialized = true;
            } else if (window.heatmapInitialized) {
                console.log('[MAIN] Heatmap already initialized');
            } else {
                console.error('[MAIN] initializeHeatmap function not found!');
            }
            break;

        case 'comparison':
            // Initialize comparison chart if not already loaded
            if (typeof initializeComparisonChart === 'function' && !window.comparisonChartInitialized) {
                initializeComparisonChart();
                window.comparisonChartInitialized = true;
            }
            break;

        case 'overview':
        default:
            // Overview panel doesn't need special initialization
            break;
    }
}

// Accordion functionality removed - replaced with individual year pages

/**
 * Utility function to format numbers with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Utility function to calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {string} Percentage string with 1 decimal place
 */
function calculatePercentage(part, total) {
    if (total === 0) return "0.0%";
    return ((part / total) * 100).toFixed(1) + "%";
}

/**
 * Utility function to create a tooltip element
 * @returns {HTMLElement} Tooltip element
 */
function createTooltip() {
    let tooltip = document.querySelector('.tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

/**
 * Show tooltip with content at mouse position
 * @param {string} content - HTML content for tooltip
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function showTooltip(content, x, y) {
    const tooltip = createTooltip();
    tooltip.innerHTML = content;
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y - 10) + 'px';
    tooltip.classList.add('visible');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

// Export functions for use in other modules
window.showPanel = showPanel;
window.formatNumber = formatNumber;
window.calculatePercentage = calculatePercentage;
window.showTooltip = showTooltip;
window.hideTooltip = hideTooltip;

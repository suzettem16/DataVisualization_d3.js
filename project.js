
let adjustInflation = false;

const inflationFactors = {
  1996: 1.63, 1997: 1.59, 1998: 1.57, 1999: 1.54,
  2000: 1.50, 2001: 1.47, 2002: 1.45, 2003: 1.42,
  2004: 1.38, 2005: 1.34, 2006: 1.30, 2007: 1.27,
  2008: 1.23, 2009: 1.28, 2010: 1.28, 2011: 1.24,
  2012: 1.21, 2013: 1.18, 2014: 1.15, 2015: 1.13,
  2016: 1.11, 2017: 1.08, 2018: 1.04, 2019: 1.00
};


document.addEventListener("DOMContentLoaded", () => { // Checkbox logic
  const inflationToggle = document.getElementById("inflationToggle");
  if (inflationToggle) {
    inflationToggle.addEventListener("change", function () {
      adjustInflation = this.checked;
      console.log("Inflation toggle changed:", adjustInflation);
      if (typeof updateMapColors === "function") updateMapColors();
      if (typeof updateCountyColors === "function") updateCountyColors();
      if (typeof updateRankings === "function") updateRankings();
      if (typeof updateBestCounty === "function") updateBestCounty();
      // Also update value range highlighting when inflation toggle changes
      if (typeof updateValueRangeHighlighting === "function") updateValueRangeHighlighting();
    });
  }
});


function adjustValueForInflation(value, year) {
  if (!adjustInflation) return value;
  const factor = inflationFactors[year] ?? 1.0;
  const adjusted = value * factor;
  console.log(`Adjusting ${value} for year ${year} → ${adjusted}`);
  return adjusted;
}






function createVis(data) {
  const topoUs = data[0];
  const zillowDataRaw = data[1];
  const zillowDataAvg = data[2];
  const states = data[3];
  const stateYearCsv = data[4];

    //adding years from data
const years = d3.keys(stateYearCsv[0]).filter(k => k !== "State")
.map(y => +y);
//   const years = (stateYearCsv.columns ? stateYearCsv.columns : Object.keys(stateYearCsv[0]))
//     .filter(k => k !== "State")
//     .map(y => +y);

const minYear = d3.min(years);
const maxYear = d3.max(years);
window.userYear = minYear; //default user value - start from first year


  const mapDataState = topojson.feature(topoUs, topoUs.objects.states).features;
  const countyAverages = calc_countyAverages(zillowDataAvg, years, states);


  const stateYearLookup = {};



  stateYearCsv.forEach(row => {
    const abbr = row.State;
    stateYearLookup[abbr] = {};
    years.forEach(y => stateYearLookup[abbr][y] = +row[y]);
  });


  createSlider("#linked-advanced .rec-class .Bcontainer .controls");   
  //adding year slider call     
createYearSlider("#year-slider-container .yearSlider", years, minYear, maxYear);

  createUSMap(
    topoUs, mapDataState, countyAverages, states,
    createStateMap, createBubble,
    zillowDataAvg, stateYearLookup, years
  );


createStateMap(topoUs, mapDataState, countyAverages, states, '06', createBubble, zillowDataAvg);

  function createBubble(zillowDataAvg, mapDataState, states, selectedCounty, selectedState) {
    const state = mapDataState.filter(d => d.id == selectedState);


    let selectAb = "";
    for (let j = 0; j < states.length; j++) {
      const [key, value] = Object.entries(states[j]);
      if (key[0] === state[0].properties.name) selectAb = key[1];
    }


    const selectRegions = zillowDataAvg
      .filter(d => d.State == selectAb && d.CountyName == selectedCounty)
      .sort((a, b) => b[String(userYear)] - a[String(userYear)]); //changed to userYear


    d3.selectAll("#linked-advanced .rec-class .state-map .county").classed("highlightState", false);


    const countyPath = d3.selectAll("#linked-advanced .rec-class .state-map .county")
      .filter(d => d.properties.NAME + " County" == selectedCounty);
    countyPath.classed("highlightState", !countyPath.classed("highlightState"));


    const height = 300;
    const width = 300;
    const margin = { top: 0, bottom: 50, left: 50, right: 20 };
    d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();


    const svg = d3.select("#linked-advanced .Bubble-container-class .bubble-chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle")
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    const pack = data => d3.pack()
      .size([width - 2, height - 2])
      .padding(4)
      (d3.hierarchy({ children: data }).sum(d => d[String(userYear)])); //changed from "2019" to userYear


    const root = pack(selectRegions.slice(0, 10));
    if (selectRegions.length >= 1) {
      const color = d3.scaleOrdinal(selectRegions.map(d => d.RegionName), d3.schemeCategory10);


      const leaf = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x + 1},${d.y + 1})`);


      leaf.append("circle")
        .attr("r", d => d.r)
        .attr("class", "cir")
        .attr("fill-opacity", 0.7)
        .attr("fill", d => color(d.data.RegionName));


      leaf.append("text")
        .selectAll("tspan")
        .data(d => d.data.RegionName.split(/(?=[A-Z][^A-Z])/g))
        .join("tspan")
        .attr("x", 0)
        .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.6}em`)
        .text(d => d);


      const format = d3.format(",d");
      leaf.append("title").text(d => `Average : ${format(d.data[userYear])}`); //changed to userYear
    }
  }
}


function createLegend(colorScale, divId, vertical, reverse) {
  const n = 512;
  const margin = 20;
  const rampWidth = 20;

  // Clear any existing legend elements
  d3.select(divId).selectAll("canvas").remove();
  d3.select(divId).selectAll("svg").remove();

  const container = d3.select(divId);
  const boundingRect = container.node().getBoundingClientRect();
  const width = boundingRect.width || 400;
  const height = boundingRect.height || 360;

  const internalScale = colorScale.copy().domain([0, 1]);
  const canvas = d3.select(divId).append("canvas")
    .attr("width", vertical ? 1 : n)
    .attr("height", vertical ? n : 1)
    .style("width", (vertical ? rampWidth : width - 2 * margin) + "px")
    .style("height", (vertical ? height - 2 * margin : rampWidth) + "px")
    .style("margin-left", (vertical ? 20 : margin) + "px")
    .style("margin-top", (vertical ? 90 : 0) + "px")
    .node();

  const context = canvas.getContext("2d");
  canvas.style.imageRendering = "pixelated";
  for (let i = 0; i < n; ++i) {
    context.fillStyle = internalScale(reverse ? (n - i) / (n - 1) : i / (n - 1));
    context.fillRect(vertical ? 0 : i, vertical ? i : 0, 1, 1);
  }

  const side = vertical ? height : width;
  const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range(reverse ? [side - 2 * margin, 0] : [0, side - 2 * margin]);
  const legendAxis = vertical ? d3.axisRight(legendScale).ticks(5) : d3.axisBottom(legendScale).ticks(5);

  const newVerticalMargin = 90; 

  d3.select(divId).append("svg")
    .attr("width", vertical ? width - rampWidth : width)
    .attr("height", vertical ? height + 60 : height - rampWidth)
    .append("g")
    .attr("transform", "translate(" + (vertical ? 0 : margin) + "," + (vertical ? newVerticalMargin : 0) + ")") 
    .call(legendAxis);
}


function createLegendDiv(colorScale, divId, vertical = false, reverse = false, size = [400, 60]) {
  // Remove existing legend div if present
  d3.select(divId).selectAll(".legend").remove();

  d3.select(divId).append("div")
    .attr("class", "legend")
    .style("width", (vertical ? size[1] : size[0]) + "px")
    .style("height", (vertical ? size[0] : size[1]) + "px")
    .style("display", "flex")
    .style("flex-direction", vertical ? "row" : "column");

  createLegend(colorScale, divId + " .legend", vertical, reverse);
}


function createStateMap(topoUs, mapDataState, countyAverages, states, stateId, createBubble, zillowDataAvg) {
  const height = 300;
  const width = 300;
  const margin = { top: 0, bottom: 50, left: 100, right: 20 };

  // Normalize stateId to string for consistent comparison
  const normalizedStateId = String(stateId);

  // Clear all state highlights first
  d3.selectAll("#linked-advanced .map-container .us-map .states").classed("highlightState", false);
  // Highlight the clicked state
  const statePath = d3.selectAll("#linked-advanced .map-container .us-map .states")
    .filter(d => String(d.id) === normalizedStateId);
  statePath.classed("highlightState", true);

  // Clear existing county map and bubble chart
  d3.selectAll("#linked-advanced .rec-class .state-map svg").remove();
  d3.selectAll("#linked-advanced .rec-class .state-map .tooltip").remove();
  d3.selectAll("#linked-advanced .rec-class .state-map .state-name-title").remove();
  d3.selectAll("#linked-advanced .rec-class .state-map-legend .legend").remove();
  d3.selectAll("#linked-advanced .rec-class .state-map-legend").selectAll("*").remove();
  d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();


  const svg = d3.select("#linked-advanced .rec-class .state-map").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const tooltip = d3.select("#linked-advanced .rec-class .state-map").append("div")
    .attr('class', 'tooltip')
    .style('opacity', 0);

  const state = mapDataState.filter(d => String(d.id) === normalizedStateId);

  let selectAb = "";
  for (let j = 0; j < states.length; j++) {
    const [key, value] = Object.entries(states[j]);
    if (key[0] === state[0].properties.name) selectAb = key[1];
  }

  const counties = topojson.feature(topoUs, topoUs.objects.counties).features
    .filter(d => d.id.slice(0, 2) === normalizedStateId.padStart(2, '0')); // match FIPS prefix

  // Get stateData for the selected state
  const stateData = topojson.feature(topoUs, topoUs.objects.states).features
    .filter(d => String(d.id) === normalizedStateId);

  // Use geoIdentity with fitSize for county map projection
  const projection = d3.geoIdentity()
    .fitSize([width, height], stateData[0]);

  const path = d3.geoPath().projection(projection);

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", function(event) {
      g.attr("transform", 
        `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`);
    });

  svg.call(zoom);

  // Calculate fixedMax for county color scale based on all counties in the state
  // Use max year to ensure scale covers all years' data
  const stateCounties = countyAverages.filter(d => d.State == selectAb);
  const fixedLegendYear = Math.max(...Object.keys(stateCounties[0] || {}).filter(k => k !== "State" && k !== "County").map(Number)) || 2019;
  const fixedVals = stateCounties.map(d => {
    const val = d[String(fixedLegendYear)];
    return adjustInflation ? adjustValueForInflation(val, fixedLegendYear) : val;
  }).filter(v => v != null && !isNaN(v) && v > 0);
  const fixedMax = d3.max(fixedVals) || 800000;

  // Create county color scale (same as US map for consistency)
  // Store both the scale and the max value so we can update the domain if needed
  const countyColor = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, fixedMax]);

  // Create legend for county map (on the right side)
  createLegendDiv(countyColor, "#linked-advanced .rec-class .state-map-legend", true, true, [300, 100]);

  function colorMapCounty(countyName) {
    const selectCounty = countyAverages.filter(d => d.State == selectAb && d.County == countyName);
    let color = "#d3d3d3";
    if (selectCounty.length === 1) {
      let v = selectCounty[0][String(userYear)];
      // Check if value exists for this year
      if (v != null && v !== undefined && !isNaN(v) && v > 0) {
        // Apply inflation adjustment if needed
        v = adjustInflation ? adjustValueForInflation(v, userYear) : v;
        // Ensure value is within scale domain
        const clampedValue = Math.min(Math.max(v, 0), fixedMax);
        color = countyColor(clampedValue);
      }
      // If no valid value, return gray (#d3d3d3)
    }
    return color;
  }

  // Store county color scale and max value globally for legend updates
  window.countyColorScale = countyColor;
  window.countyColorMax = fixedMax;


  function tip_county(countyName) {
    const selectCounty = countyAverages.filter(d => d.County == countyName && d.State == selectAb);
    let content;
    if (selectCounty.length === 1) {
      let v = selectCounty[0][String(userYear)];
      if (v != null) v = adjustValueForInflation(v, userYear);
      const displayYear = adjustInflation ? `${userYear} (2019 USD)` : userYear;
      content = `State: ${state[0].properties.name}<br>${selectCounty[0].County}<br>Average in ${displayYear}: $${d3.format(",.0f")(v)}`;
    } else {
      content = `State: ${state[0].properties.name}<br>${countyName}<br>No data`;
    }
    tooltip.transition().duration(50).style("display", "inline").style('opacity', 0.9);
    tooltip.html(content).style('left', d3.event.pageX + 'px').style('top', d3.event.pageY - 28 + 'px');
  }


  const countiesSel = g.selectAll(".county")
    .data(counties)
    .enter().append("path")
    .attr("d", path)
    .attr("class", "county")
    .attr("stroke", "white")
    .attr("fill", d => colorMapCounty(d.properties.name + " County"))
    .on('mouseover', d => tip_county(d.properties.name + " County"))
    .on('mouseout', () => tooltip.transition().duration(500).style('opacity', 0))
    .on("click", d => createBubble(zillowDataAvg, mapDataState, states, d.properties.name + " County", normalizedStateId))
    .transition().duration(1000);

  // Store counties selection and related data globally for year updates
  // Store these in the closure scope AND globally to ensure they're always accessible
  window.countiesSelection = countiesSel;
  window.currentStateAbbr = selectAb;
  window.currentStateCounties = counties;
  window.currentCountyAverages = countyAverages;
  window.currentCountyColor = countyColor;
  window.currentCountyMax = fixedMax;
  
  // Also store in closure for direct access
  const storedSelectAb = selectAb;
  const storedCountyAverages = countyAverages;
  const storedCountyColor = countyColor;
  const storedFixedMax = fixedMax;

  // Store counties selection for year updates
  window.updateCountyColors = function(immediate = false) {
    try {
      // Re-select counties to ensure we have the current selection
      // Try multiple selector strategies to ensure we find the counties
      let countiesToUpdate = d3.selectAll("#linked-advanced .rec-class .state-map .county");
      if (countiesToUpdate.empty()) {
        countiesToUpdate = d3.selectAll(".state-map .county");
      }
      if (countiesToUpdate.empty()) {
        countiesToUpdate = d3.selectAll(".county");
      }
      
      if (countiesToUpdate.empty()) {
        // Don't log warning during animation to avoid console spam
        if (!immediate) {
          console.warn('No counties found to update');
        }
        return;
      }
      
      // Get state abbreviation and county averages
      // Try to use closure variables first, fallback to globals, then direct closure variables
      let stateAb, countyAveragesData, colorScale, maxVal;
      
      // Use closure variables if accessible (since we're in closure scope)
      try {
        if (typeof storedSelectAb !== 'undefined') stateAb = storedSelectAb;
        if (typeof storedCountyAverages !== 'undefined') countyAveragesData = storedCountyAverages;
        if (typeof storedCountyColor !== 'undefined') colorScale = storedCountyColor;
        if (typeof storedFixedMax !== 'undefined') maxVal = storedFixedMax;
      } catch(e) {}
      
      // Fallback to globals if closure variables not available
      if (!stateAb) stateAb = window.currentStateAbbr;
      if (!countyAveragesData) countyAveragesData = window.currentCountyAverages;
      if (!colorScale) colorScale = window.currentCountyColor;
      if (!maxVal) maxVal = window.currentCountyMax;
      
      // Final fallback to direct closure variables (if in scope)
      if (!stateAb && typeof selectAb !== 'undefined') stateAb = selectAb;
      if (!countyAveragesData && typeof countyAverages !== 'undefined') countyAveragesData = countyAverages;
      if (!colorScale && typeof countyColor !== 'undefined') colorScale = countyColor;
      if (!maxVal && typeof fixedMax !== 'undefined') maxVal = fixedMax;
    
    // Force re-calculation by updating fill directly, using current userYear and state data
    countiesToUpdate.each(function(d) {
      const countyName = d.properties.name + " County";
      // Try to find county data - check both with and without " County" suffix
      let countyData = countyAveragesData.filter(c => c.State == stateAb && c.County == countyName);
      
      // If not found, try without " County" suffix
      if (countyData.length === 0) {
        const nameWithoutCounty = d.properties.name;
        countyData = countyAveragesData.filter(c => c.State == stateAb && c.County == nameWithoutCounty);
      }
      
      // If still not found, try with just the name (some counties might not have "County" in data)
      if (countyData.length === 0) {
        countyData = countyAveragesData.filter(c => c.State == stateAb && 
          (c.County == countyName || c.County == d.properties.name || c.County == nameWithoutCounty));
      }
      
      let color = "#d3d3d3";
      if (countyData.length > 0) {
        // Use first match (should be unique but handle edge cases)
        const county = countyData[0];
        let v = county[String(userYear)];
        
        // If value is missing, try converting userYear to string with different formats
        if (v == null || v === undefined || isNaN(v)) {
          v = county[userYear]; // Try without string conversion
        }
        
        // Check if value exists and is valid for this year
        if (v != null && v !== undefined && !isNaN(v) && v > 0) {
          // Apply inflation adjustment if needed
          v = adjustInflation ? adjustValueForInflation(v, userYear) : v;
          
          // Ensure value is within scale domain - don't clamp high values, just ensure it's positive
          const clampedValue = Math.max(v, 0);
          // Ensure color scale can handle the value
          if (clampedValue <= maxVal) {
            color = colorScale(clampedValue);
          } else {
            // Value exceeds max - use max color instead of gray
            color = colorScale(maxVal);
          }
          
          // Double-check color is valid
          if (!color || color === "undefined" || color === "null") {
            console.warn('Invalid color for county:', countyName, 'value:', v, 'maxVal:', maxVal);
            color = "#d3d3d3";
          }
        }
      }
      
      // Update fill immediately if during animation, otherwise use transition
      if (immediate) {
        d3.select(this).attr("fill", color); // Immediate update, no transition
      } else {
        d3.select(this).transition().duration(400).attr("fill", color);
      }
    });
    
    // Update legend when year changes
    if (window.countyColorScale) {
      d3.selectAll("#linked-advanced .rec-class .state-map-legend .legend").remove();
      createLegendDiv(window.countyColorScale, "#linked-advanced .rec-class .state-map-legend", true, true, [300, 100]);
    }
    } catch (error) {
      // Don't let county color update errors stop animation
      console.error('Error updating county colors:', error);
    }
  };

  // Connect value range slider to county map
  // This adds county map configuration to the shared slider handler
  sliderChange(
    "#linked-advanced .rec-class .Bcontainer .controls",
    states,
    mapDataState,
    countyAverages,
    "#linked-advanced .rec-class .state-map .county",
    normalizedStateId,
    null // stateYearLookup - already set in createUSMap
  );

  // Add state name title below the county map in bold, bigger text
  d3.select("#linked-advanced .rec-class .state-map")
    .append("div")
    .attr("class", "state-name-title")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .style("text-align", "center")
    .style("margin-top", "10px")
    .style("color", "#333")
    .text(state[0].properties.name);
}




function createSlider(sliderId) {
  const slider = document.querySelector(sliderId);
  if (!slider || slider.noUiSlider) return;
  noUiSlider.create(slider, {
    start: [0, 800],
    connect: true,
    range: {
      'min': 0,
      '12.5%': 100,
      '25%': 200,
      '37.5%': 300,
      '50%': 400,
      '62.5%': 500,
      '75%': 600,
      '87.5%': 700,
      'max': 800
    },
    pips: { mode: 'steps', stepped: true, density: 4 }
  });
}
function createYearSlider(yearID, yearsVar, minY, maxY) {
    var yearSlider = document.querySelector(yearID);
    noUiSlider.create(yearSlider, {
        start: [minY], // Start at first year (1996) instead of last year
        connect: [true, false],
        step: 1,
        range: {min: minY, max: maxY},
        pips: {
                  mode: 'values',
                //   values: yearsVar,
                  values: yearsVar.filter((d, i) => i % 3 == 0 || i == yearsVar.length-1),
                  density: 4

            
        }});

    // Store update handler so it can be removed/re-added
    let updateEventHandler = function(values, handle){
        userYear = parseFloat(values[handle]);
        d3.select("#linked-advanced .map-container .us-map .year-label").text("Year: " + userYear);
        if (typeof updateMapColors === "function") updateMapColors();
        if (typeof updateCountyColors === "function") updateCountyColors();
        if (typeof updateRankings === "function") updateRankings();
        if (typeof updateBestCounty === "function") updateBestCounty();
        // Also update value range highlighting when year changes
        if (typeof updateValueRangeHighlighting === "function") updateValueRangeHighlighting();
        
        // Note: Don't update timelapse state index here during animation
        // The animation loop manages its own index to avoid conflicts
    };
    
    // Update handler for map, rankings, etc. when slider value changes
    yearSlider.noUiSlider.on('update', updateEventHandler);
    
    // Track if we're programmatically updating the slider (not user interaction)
    let isAnimating = false;
    let startEventHandler = null;

    // Pause timelapse if user manually interacts with slider
    startEventHandler = function() {
        // Only stop animation if NOT currently animating (i.e., user interaction)
        if (!isAnimating && window.timelapseState && window.timelapseState.isPlaying) {
            window.stopTimeLapse();
        }
    };
    yearSlider.noUiSlider.on('start', startEventHandler);

    // New time-lapse animation system
    window.timelapseState = {
        isPlaying: false,
        currentYearIndex: 0, // Start from first year (index 0)
        animationId: null,
        duration: 15000, // Total animation duration in milliseconds
        pauseAtEnd: true,
        yearsArray: yearsVar // Store years array for reference
    };

    // Start time-lapse animation
    window.startTimeLapse = function(duration = 15000, pauseAtEnd = true) {
        // Stop any existing animation first
        window.stopTimeLapse();
        
        if (!window.timelapseState) {
            window.timelapseState = {
                isPlaying: false,
                currentYearIndex: 0,
                animationId: null,
                duration: 15000,
                pauseAtEnd: true,
                yearsArray: yearsVar
            };
        }
        
        window.timelapseState.isPlaying = true;
        window.timelapseState.duration = duration;
        window.timelapseState.pauseAtEnd = pauseAtEnd;
        
        // Hardcode years 1996-2019 (24 years total)
        const yearList = [];
        for (let y = 1996; y <= 2019; y++) {
            yearList.push(y);
        }
        const totalYears = yearList.length;
        const frameDuration = duration / totalYears;
        
        // Always start from beginning (index 0)
        let currentIndex = 0;
        window.timelapseState.currentYearIndex = 0;
        
        // Disable ALL event handlers during animation to prevent interference
        isAnimating = true;
        if (startEventHandler) {
            yearSlider.noUiSlider.off('start', startEventHandler);
        }
        if (updateEventHandler) {
            yearSlider.noUiSlider.off('update', updateEventHandler);
        }
        
        const animate = () => {
            try {
                // Check if animation should continue - must check at start
                if (!window.timelapseState || !window.timelapseState.isPlaying) {
                    console.log('Animation stopped: state check failed', {
                        hasState: !!window.timelapseState,
                        isPlaying: window.timelapseState?.isPlaying
                    });
                    isAnimating = false;
                    if (startEventHandler) yearSlider.noUiSlider.on('start', startEventHandler);
                    if (updateEventHandler) yearSlider.noUiSlider.on('update', updateEventHandler);
                    return;
                }
                
                // Check if we've reached the end BEFORE updating
                if (currentIndex >= totalYears) {
                    console.log('Animation reached end at index:', currentIndex);
                    isAnimating = false;
                    if (startEventHandler) yearSlider.noUiSlider.on('start', startEventHandler);
                    if (updateEventHandler) yearSlider.noUiSlider.on('update', updateEventHandler);
                    if (pauseAtEnd) {
                        window.timelapseState.isPlaying = false;
                        window.timelapseState.currentYearIndex = totalYears - 1;
                        window.timelapseState.animationId = null;
                        updatePlayPauseButton(); // Update button when animation ends
                        return;
                    }
                    // Loop back to start
                    currentIndex = 0;
                    window.timelapseState.currentYearIndex = 0;
                    isAnimating = true;
                    if (startEventHandler) yearSlider.noUiSlider.off('start', startEventHandler);
                    if (updateEventHandler) yearSlider.noUiSlider.off('update', updateEventHandler);
                }
                
                // Update to current year
                const targetYear = yearList[currentIndex];
                console.log('Animating to year:', targetYear, 'index:', currentIndex, '/', totalYears, 'isPlaying:', window.timelapseState.isPlaying);
                
                // Update everything manually (no events will fire since handlers are disabled)
                userYear = targetYear;
                d3.select("#linked-advanced .map-container .us-map .year-label").text("Year: " + userYear);
                
                // Update visuals - wrap in try-catch to prevent errors from stopping animation
                // Use immediate updates during animation for better responsiveness
                try {
                    if (typeof updateMapColors === "function") updateMapColors();
                } catch(e) { console.error('updateMapColors error:', e); }
                try {
                    if (typeof updateCountyColors === "function") updateCountyColors(true); // true = immediate update
                } catch(e) { console.error('updateCountyColors error:', e); }
                try {
                    if (typeof updateRankings === "function") updateRankings();
                } catch(e) { console.error('updateRankings error:', e); }
                try {
                    if (typeof updateBestCounty === "function") updateBestCounty();
                } catch(e) { console.error('updateBestCounty error:', e); }
                try {
                    if (typeof updateValueRangeHighlighting === "function") updateValueRangeHighlighting();
                } catch(e) { console.error('updateValueRangeHighlighting error:', e); }
                
                // Update slider position (no events will fire)
                try {
                    yearSlider.noUiSlider.set([targetYear]);
                } catch(e) {
                    console.error('Slider set error:', e);
                }
                
                // Update index for next iteration
                window.timelapseState.currentYearIndex = currentIndex;
                currentIndex++;
                
                // CRITICAL: Check if still playing BEFORE scheduling next frame
                const stillPlaying = window.timelapseState && window.timelapseState.isPlaying;
                console.log('After update - currentIndex:', currentIndex, 'totalYears:', totalYears, 'stillPlaying:', stillPlaying);
                
                // ALWAYS schedule next frame if we haven't reached the end AND still playing
                if (currentIndex < totalYears && stillPlaying) {
                    window.timelapseState.animationId = setTimeout(() => {
                        console.log('setTimeout callback executing for index', currentIndex);
                        animate();
                    }, frameDuration);
                    console.log('Scheduled next frame for index', currentIndex, 'in', frameDuration, 'ms, timeout ID:', window.timelapseState.animationId);
                } else if (currentIndex >= totalYears) {
                    console.log('Reached end, not scheduling more frames');
                    isAnimating = false;
                    if (startEventHandler) yearSlider.noUiSlider.on('start', startEventHandler);
                    if (updateEventHandler) yearSlider.noUiSlider.on('update', updateEventHandler);
                } else {
                    console.log('NOT scheduling - animation stopped!', {
                        isPlaying: window.timelapseState?.isPlaying,
                        currentIndex,
                        totalYears
                    });
                    isAnimating = false;
                    if (startEventHandler) yearSlider.noUiSlider.on('start', startEventHandler);
                    if (updateEventHandler) yearSlider.noUiSlider.on('update', updateEventHandler);
                }
            } catch(error) {
                console.error('Error in animate function:', error);
                isAnimating = false;
                if (startEventHandler) yearSlider.noUiSlider.on('start', startEventHandler);
                if (updateEventHandler) yearSlider.noUiSlider.on('update', updateEventHandler);
                if (window.timelapseState) {
                    window.timelapseState.isPlaying = false;
                }
            }
        };
        
        // Start animation immediately
        console.log('Starting animation from index 0, total years:', totalYears, 'frameDuration:', frameDuration);
        animate();
        
        // Update play/pause button to show pause
        updatePlayPauseButton();
    };

    // Stop time-lapse animation
    window.stopTimeLapse = function() {
        // Clear animation flag
        isAnimating = false;
        
        // Re-enable event handlers
        if (startEventHandler) {
            yearSlider.noUiSlider.on('start', startEventHandler);
        }
        if (updateEventHandler) {
            yearSlider.noUiSlider.on('update', updateEventHandler);
        }
        
        if (window.timelapseState) {
            if (window.timelapseState.animationId) {
                clearTimeout(window.timelapseState.animationId);
                window.timelapseState.animationId = null;
            }
            window.timelapseState.isPlaying = false;
        }
        
        // Update play/pause button to show play
        updatePlayPauseButton();
    };

    // Toggle play/pause
    window.toggleTimeLapse = function() {
        if (window.timelapseState && window.timelapseState.isPlaying) {
            window.stopTimeLapse();
        } else {
            if (!window.timelapseState) {
                window.timelapseState = {
                    isPlaying: false,
                    currentYearIndex: 0,
                    animationId: null,
                    duration: 15000,
                    pauseAtEnd: true,
                    yearsArray: yearsVar
                };
            }
            window.startTimeLapse(window.timelapseState.duration, window.timelapseState.pauseAtEnd);
        }
    };


    // Update play/pause button text based on animation state
    function updatePlayPauseButton() {
        const playPauseButton = document.getElementById("playPauseButton");
        if (playPauseButton) {
            if (window.timelapseState && window.timelapseState.isPlaying) {
                playPauseButton.textContent = "Pause";
                playPauseButton.title = "Pause animation";
            } else {
                playPauseButton.textContent = "Replay";
                playPauseButton.title = "Replay animation";
            }
        }
    }

    // Play/Pause button functionality
    const playPauseButton = document.getElementById("playPauseButton");
    if (playPauseButton) {
        playPauseButton.addEventListener("click", () => {
            window.toggleTimeLapse();
            // Update button text after a short delay to ensure state is updated
            setTimeout(updatePlayPauseButton, 50);
        });
    }

    // Update button when animation starts or stops
    // We'll update the button inside stopTimeLapse and startTimeLapse functions

    // Start time-lapse automatically on initial load
    // Since slider now starts at minY, we can start timelapse directly
    setTimeout(() => {
        window.timelapseState.currentYearIndex = 0;
        window.startTimeLapse(15000, true);
        // Initial button state update
        updatePlayPauseButton();
    }, 500);
}


// function createYearSlider(sliderId, years) {
//   const slider = document.querySelector(sliderId);
//   if (!slider || slider.noUiSlider) return;
//   const minY = d3.min(years), maxY = d3.max(years);
//   noUiSlider.create(slider, {
//     start: [maxY],
//     step: 1,
//     connect: [true, false],
//     range: { min: minY, max: maxY },
//     pips: {
//       mode: 'values',
//       values: years.filter((d, i) => i % 2 === 0),
//       density: 2
//     }
//   });
// }


// Store references for value range slider to update both maps
window.valueRangeSliderConfig = {
  stateYearLookup: null,
  states: null,
  countyConfig: null
};

function sliderChange(sliderId, states, mapDataState, countyAverages, divId, stateId, stateYearLookup) {
  const slider = document.querySelector(sliderId);
  if (!slider || !slider.noUiSlider) return;

  // Store configuration for state map if provided
  if (stateYearLookup) {
    window.valueRangeSliderConfig.stateYearLookup = stateYearLookup;
    window.valueRangeSliderConfig.states = states; // Store states for lookup
  }

  // Store configuration for county map if provided
  if (stateId && divId) {
    const state = mapDataState.filter(d => d.id == stateId);
    if (state.length > 0) {
      // full state name -> abbr
      let selectAb = "";
      for (let j = 0; j < states.length; j++) {
        const [key, value] = Object.entries(states[j]);
        if (key[0] === state[0].properties.name) selectAb = key[1];
      }
      window.valueRangeSliderConfig.countyConfig = {
        states: states,
        mapDataState: mapDataState,
        countyAverages: countyAverages,
        divId: divId,
        stateId: stateId,
        selectAb: selectAb
      };
    }
  }

  // Function to update highlighting based on slider range for both maps
  const updateHighlighting = function(values) {
    const min = +values[0] * 1000;
    const max = +values[1] * 1000;
    const config = window.valueRangeSliderConfig;

    // Update US map (states) highlighting if stateYearLookup is available
    if (config.stateYearLookup && window.statesSel) {
      const statesOutRange = Object.keys(config.stateYearLookup).filter(abbr => {
        let value = config.stateYearLookup[abbr][userYear];
        if (value != null) value = adjustValueForInflation(value, userYear);
        if (value == null || isNaN(value) || value <= 0) return false;
        return value < min || value > max;
      });

      // Clear previous highlights on states
      window.statesSel.classed("highlight", false);
      
      // Highlight states outside the range
      if (statesOutRange.length > 0) {
        window.statesSel
          .filter(d => {
            const stateName = d.properties.name;
            const stateObj = config.states.find(s => {
              const [name] = Object.entries(s)[0];
              return name === stateName;
            });
            if (stateObj) {
              const [name, ab] = Object.entries(stateObj)[0];
              return statesOutRange.includes(ab);
            }
            return false;
          })
          .classed("highlight", true);
      }
    }

    // Update county map highlighting if county config is available
    if (config.countyConfig) {
      const cc = config.countyConfig;
      const selectCounties = cc.countyAverages.filter(d => d.State == cc.selectAb);

      // Filter counties outside the range using current year
      const countiesOutRange = selectCounties.filter(d => {
        const yearVal = +d[String(userYear)];
        if (isNaN(yearVal) || yearVal <= 0) return false;
        const adjustedVal = adjustInflation ? adjustValueForInflation(yearVal, userYear) : yearVal;
        return adjustedVal < min || adjustedVal > max;
      });

      // Clear previous highlights
      d3.selectAll(cc.divId).classed("highlight", false);
      
      // Highlight counties outside the range
      if (countiesOutRange.length !== 0) {
        const keys2 = countiesOutRange.map(d => d.County);
        d3.selectAll(cc.divId)
          .filter(d => keys2.includes(d.properties.name + " County"))
          .classed("highlight", true);

        d3.selectAll(cc.divId).classed("highlightState", false);
        d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();
      }
    }
  };

  // Connect slider change event (replace any existing handler)
  slider.noUiSlider.off('change');
  slider.noUiSlider.on('change', function (values) {
    updateHighlighting(values);
  });

  // Store update function for external calls (e.g., when year changes)
  window.updateValueRangeHighlighting = function() {
    if (slider && slider.noUiSlider) {
      const currentValues = slider.noUiSlider.get();
      updateHighlighting(currentValues);
    }
  };
}


function createUSMap(
  data, mapDataState, countyAverages, states,
  createStateMap, createBubble, zillowDataAvg,
  stateYearLookup, years
) {
  const height = 600;
  const width = 550;
  const margin = { top: 20, bottom: 50, left: 0, right: 20 }; // <--- Change this line  

  d3.selectAll("#linked-advanced .map-container .us-map svg ").remove();
  d3.selectAll("#linked-advanced .map-container .us-map .tooltip").remove();
  d3.selectAll("#linked-advanced .map-container .us-map .legend").remove();
  d3.selectAll("#linked-advanced .map-container .us-map .year-label").remove();


  const mapSvg = d3.select("#linked-advanced .map-container .us-map").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  const tooltip = d3.select("#linked-advanced .map-container .us-map").append("div")
    .attr('class', 'tooltip')
    .style('opacity', 0);


  d3.select("#linked-advanced .map-container .us-map")
    .append("div")
    .attr("class", "year-label");


  const color = d3.scaleSequential(d3.interpolateYlOrRd);
  const fixedLegendYear = d3.max(years) || 2019;
  const fixedVals = Object.keys(stateYearLookup)
  .map(ab => {
    const val = stateYearLookup[ab][fixedLegendYear];
    return adjustInflation ? adjustValueForInflation(val, fixedLegendYear) : val;
  })
  .filter(v => !isNaN(v));


const fixedMax = d3.max(fixedVals) || 800000;
color.domain([0, fixedMax]);




  createLegendDiv(color, "#linked-advanced .map-container .us-map", true, true, [360, 100]);


  function toAbbr(stateName) {
    for (let j = 0; j < states.length; j++) {
      const [key, value] = Object.entries(states[j]);
      if (key[0] === stateName) return key[1];
    }
    return null;
  }


  function tip(stateName, year) {
  const ab = toAbbr(stateName);
  let v = ab && stateYearLookup[ab] ? stateYearLookup[ab][year] : undefined;


  if (v != null) v = adjustValueForInflation(v, year);


  const displayYear = adjustInflation ? `${year} (2019 USD)` : year;


  const content = (v != null)
    ? `State: ${stateName}<br>Average in ${displayYear}: $${d3.format(",.0f")(v)}`
    : "No Data";


  tooltip.transition()
    .duration(100)
    .style("display", "inline")
    .style("opacity", 0.9);
  tooltip.html(content)
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY - 28 + "px");
}




  function colorMapState(stateName, year) {
    const ab = toAbbr(stateName);
    let v = ab && stateYearLookup[ab] ? stateYearLookup[ab][year] : null;
    if (v != null) v = adjustValueForInflation(v, year);
    return (v == null) ? "#d3d3d3" : color(v);
  }


  function scale(scaleFactor) {
    return d3.geoTransform({
      point: function (x, y) { this.stream.point(x * scaleFactor, y * scaleFactor); }
    });
  }
  const path = d3.geoPath().projection(scale(0.6));


//   let currentYear = fixedLegendYear;

  const statesSel = mapSvg.selectAll("path")
    .data(topojson.feature(data, data.objects.states).features)
    .enter().append("path")
    .attr("d", path)
    .attr("class", "states")
    .attr("stroke", "black")
    .on('mouseover', d => tip(d.properties.name, userYear)) //change to userYear, previous CurrentYear
    .on('mouseout', () => { tooltip.transition().duration(500).style('opacity', 0); })
    .on('click', d => createStateMap(data, mapDataState, countyAverages, states, d.id, createBubble, zillowDataAvg))


    .attr("transform", "translate(0,60)")
    .attr("fill", d => colorMapState(d.properties.name, userYear)); //changed to userYear, previous current year

  // Store states selection globally for slider updates
  window.statesSel = statesSel;


    //don't need anymore
//   const yearSlider = document.querySelector("#linked-advanced .rec-class .Bcontainer .controls-year");
//   if (yearSlider && yearSlider.noUiSlider) {
//     yearSlider.noUiSlider.off("update");
//     yearSlider.noUiSlider.on("update", function (values) {
//       const y = Math.round(+values[0]);
//       if (y === currentYear) return;
//       currentYear = y;
//       d3.select("#linked-advanced .map-container .us-map .year-label").text("Year: " + currentYear);
//       statesSel
//         .on('mouseover', d => tip(d.properties.name, currentYear))
//         .transition()
//         .duration(400)
//         .attr("fill", d => colorMapState(d.properties.name, currentYear));
//     });
//   }
    function updateMapColors() {
        // const currentVals = Object.keys(stateYearLookup)
        //     .map(ab => {
        //         const val = stateYearLookup[ab][userYear]; //changed to userYear
        //         if (isNaN(val)) return null;
        //         return adjustInflation ? adjustValueForInflation(val, userYear) : val; //changed to userYear
        //     })
        //     .filter(v => v !== null && !isNaN(v));


        // const newMax = d3.max(currentVals) || 800000;
        // //state map colors adjust to legend color while user changes
        d3.selectAll("#linked-advanced .map-container .us-map .legend").remove();
        createLegendDiv(color, "#linked-advanced .map-container .us-map", true, true, [360, 100]);

        statesSel.transition().duration(400)
            .attr("fill", d => colorMapState(d.properties.name, userYear)); //changed to userYear
        if (typeof updateRankings === "function") updateRankings();
        if (typeof updateBestCounty === "function") updateBestCounty();
        // Also update value range highlighting when year changes
        if (typeof updateValueRangeHighlighting === "function") updateValueRangeHighlighting();
    }  


window.updateMapColors = updateMapColors;

  // Connect value range slider to US map (states)
  sliderChange(
    "#linked-advanced .rec-class .Bcontainer .controls",
    states,
    mapDataState,
    countyAverages,
    null, // divId for counties (not applicable for US map)
    null, // stateId (not applicable for US map)
    stateYearLookup // Pass stateYearLookup to enable state highlighting
  );

  // Ranking system function
  window.updateRankings = function() {
    const rankingList = d3.select("#ranking-list");
    rankingList.selectAll("*").remove();

    // Build abbreviation to name mapping once
    const abbrToName = {};
    states.forEach(stateObj => {
      const [name, ab] = Object.entries(stateObj)[0];
      abbrToName[ab] = name;
    });

    // Get all states with their values for current year
    const stateData = Object.keys(stateYearLookup).map(abbr => {
      const stateName = abbrToName[abbr] || abbr;
      let value = stateYearLookup[abbr][userYear];
      if (value != null) value = adjustValueForInflation(value, userYear);
      
      return { abbr, stateName, value: value || 0 };
    }).filter(d => d.value > 0)
      .sort((a, b) => a.value - b.value); // Sort cheapest to most expensive

    // Create ranking items
    const items = rankingList.selectAll(".ranking-item")
      .data(stateData)
      .enter()
      .append("div")
      .attr("class", "ranking-item")
      .on("click", d => {
        // Find state by name and click it
        const stateFeature = mapDataState.find(state => state.properties.name === d.stateName);
        if (stateFeature) {
          createStateMap(data, mapDataState, countyAverages, states, stateFeature.id, createBubble, zillowDataAvg);
        }
      })
      .style("cursor", "pointer");

    items.append("span")
      .attr("class", "ranking-rank")
      .text((d, i) => (i + 1) + ".");

    items.append("span")
      .attr("class", "ranking-state")
      .text(d => d.stateName);

    items.append("span")
      .attr("class", "ranking-value")
      .text(d => "$" + d3.format(",.0f")(d.value));
  };

  // Initialize rankings
  updateRankings();

  // Best County Recommendation function
  window.updateBestCounty = function() {
    const bestCountyInfo = d3.select("#best-county-info");
    bestCountyInfo.selectAll("*").remove();

    // Find county with lowest home value for current year
    let bestCounty = null;
    let lowestValue = Infinity;

    // Build abbreviation to name mapping
    const abbrToName = {};
    states.forEach(stateObj => {
      const [name, ab] = Object.entries(stateObj)[0];
      abbrToName[ab] = name;
    });

    // Search through all counties
    countyAverages.forEach(county => {
      let value = county[String(userYear)];
      if (value != null && value > 0) {
        value = adjustValueForInflation(value, userYear);
        if (value < lowestValue) {
          lowestValue = value;
          bestCounty = {
            county: county.County,
            state: abbrToName[county.State] || county.State,
            stateAbbr: county.State,
            value: value
          };
        }
      }
    });

    if (bestCounty) {
      const displayYear = adjustInflation ? `${userYear} (2019 USD)` : userYear;
      
      bestCountyInfo.append("div")
        .attr("class", "best-county-name")
        .text(`${bestCounty.county}`);

      bestCountyInfo.append("div")
        .attr("class", "best-county-details")
        .text(`${bestCounty.state}`);

      bestCountyInfo.append("div")
        .attr("class", "best-county-details")
        .text(`Year: ${displayYear}`);

      bestCountyInfo.append("div")
        .attr("class", "best-county-value")
        .text("$" + d3.format(",.0f")(bestCounty.value));

      bestCountyInfo.on("click", () => {
        // Find state by abbreviation and navigate to it
        const stateFeature = mapDataState.find(state => {
          const stateObj = states.find(s => {
            const [name, ab] = Object.entries(s)[0];
            return ab === bestCounty.stateAbbr;
          });
          if (stateObj) {
            const [name] = Object.entries(stateObj)[0];
            return state.properties.name === name;
          }
          return false;
        });
        if (stateFeature) {
          createStateMap(data, mapDataState, countyAverages, states, stateFeature.id, createBubble, zillowDataAvg);
        }
      })
      .style("cursor", "pointer");
    } else {
      bestCountyInfo.append("div")
        .attr("class", "best-county-details")
        .text("No data available");
    }
  };

  // Initialize best county
  updateBestCounty();




}


function groupBy(list, keyGetter) {
  const map = new Map();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}


function calc_countyAverages(zillowDataAvg, yearsArr, states) {
  const countyAverage = [];
  const stateGroup = groupBy(zillowDataAvg, d => (d.State));
  const yearsString = yearsArr.map(String);


  for (let j = 0; j < states.length; j++) {
    const [[name, abbr]] = Object.entries(states[j]);
    const c_names = stateGroup.get(abbr);
    const grouped_byCounty = groupBy(c_names, d => d.CountyName);
    // const county_grp = Array.from(grouped_byCounty);


    //pre computing for each year
    for( const [countyName, rows] of grouped_byCounty.entries()) {
        const record = {State: abbr, County: countyName};
        for (const y of yearsString) {
            record[y] = Math.round(d3.mean(rows, r => +r[y]) || 0);
            
        }
        countyAverage.push(record);

    }


    // for (let i = 0; i < county_grp.length; i++) {
    //   let tot2019 = 0;
    //   for (let k = 0; k < county_grp[i][1].length; k++) {
    //     tot2019 = tot2019 + parseInt(county_grp[i][1][k]["2019"]);
    //   }




    //   countyAverage.push({
    //     "State": key[1], "County": county_grp[i][0],
    //     "2019": parseInt(tot2019 / county_grp[i][1].length)
    //   });
    // }
  }
  return countyAverage;
}


Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json"),
  d3.csv("https://raw.githubusercontent.com/PSdiv/zillow/master/City_Zhvi_AllHomes.csv"),
  d3.csv("https://raw.githubusercontent.com/PSdiv/zillow/master/City_Zhvi_AllHomes_yearAvrg1.csv"),
  d3.json("https://raw.githubusercontent.com/PSdiv/zillow/master/statesAbbreviation"),
  d3.csv("State_Zhvi_Averages.csv")
]).then(createVis);

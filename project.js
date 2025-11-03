
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
window.userYear = maxYear; //default user value


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


createStateMap(topoUs, mapDataState, countyAverages, states, '17', createBubble, zillowDataAvg);

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
  d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();


  const svg = d3.select("#linked-advanced .rec-class .state-map").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const tooltip = d3.select("#linked-advanced .rec-class .state-map").append("div")
    .attr('class', 'tooltip')
    .style('opacity', 0);

  // Filter state data for the selected state
  const stateData = topojson.feature(topoUs, topoUs.objects.states).features
    .filter(d => String(d.id) === normalizedStateId);

  const state = mapDataState.filter(d => String(d.id) === normalizedStateId);

  // Safety check: ensure state data exists
  if (!stateData.length || !state.length) {
    console.error("State data not found for ID:", normalizedStateId);
    return;
  }

  let selectAb = "";
  for (let j = 0; j < states.length; j++) {
    const [key, value] = Object.entries(states[j]);
    if (key[0] === state[0].properties.name) selectAb = key[1];
  }

  // Get all counties data
  const countiesData = topojson.feature(topoUs, topoUs.objects.counties).features;
  
  // Filter counties for the selected state using FIPS prefix
  const counties = countiesData
    .filter(d => d.id.slice(0, 2) === normalizedStateId.padStart(2, '0')); // match FIPS prefix

  // Use geoIdentity with fitSize for choropleth map (fits to state boundary)
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

  // Calculate max county value for the selected state for proper color scaling
  // Use a reference year (2019) to calculate the max, then scale colors accordingly
  const referenceYear = "2019"; // Use 2019 as reference year for consistent scaling
  const stateCounties = countyAverages.filter(d => d.State == selectAb);
  
  // Calculate max from reference year for consistent color scale
  const countyValues = stateCounties
    .map(d => {
      const val = d[referenceYear];
      return val != null && !isNaN(val) && val > 0 
        ? (adjustInflation ? adjustValueForInflation(val, +referenceYear) : val) 
        : null;
    })
    .filter(v => v !== null && !isNaN(v) && v > 0);
  const countyMax = d3.max(countyValues) || 800000;

  // Create color scale for counties using the same scheme as states
  const countyColorScale = d3.scaleSequential(t => d3.interpolateYlOrRd(0.8 + 0.8 * t)).domain([0, countyMax]);

  function colorMapCounty(countyName) {
    const selectCounty = countyAverages.filter(d => d.State == selectAb && d.County == countyName);
    let color = "#d3d3d3"; // default gray for no data
    if (selectCounty.length === 1) {
      let v = selectCounty[0][String(userYear)];
      if (v != null && v > 0) {
        v = adjustValueForInflation(v, userYear);
        color = countyColorScale(v);
      }
    }
    return color;
  }


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

  // Store counties selection for year updates
  window.updateCountyColors = function() {
    countiesSel.transition().duration(400)
      .attr("fill", d => colorMapCounty(d.properties.name + " County"));
    // Also update slider highlighting when year changes (re-evaluate range)
    const slider = document.querySelector("#linked-advanced .rec-class .Bcontainer .controls");
    if (slider && slider.noUiSlider) {
      const currentValues = slider.noUiSlider.get();
      // Trigger slider change event to update highlighting with new year data
      slider.noUiSlider.set(currentValues);
    }
  };

  // Connect value range slider to county map
  sliderChange(
    "#linked-advanced .rec-class .Bcontainer .controls",
    states,
    mapDataState,
    countyAverages,
    "#linked-advanced .rec-class .state-map .county",
    normalizedStateId
  );

  g.append("text")
    .attr("class", "label_text")
    .attr("x", width - 80)
    .attr("y", 15)
    .text(state[0].properties.name)
    .raise();
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
        start: [maxY],
        connect: [true, false],
        step: 1,
        range: {min: minY, max: maxY},
        pips: {
                  mode: 'values',
                //   values: yearsVar,
                  values: yearsVar.filter((d, i) => i % 3 == 0 || i == yearsVar.length-1),
                  density: 4

            
        }});

    //     working on this
    yearSlider.noUiSlider.on('update', function(values, handle){
        userYear = parseFloat(values[handle]);
        d3.select("#linked-advanced .map-container .us-map .year-label").text("Year: " + userYear);
        if (typeof updateMapColors === "function") updateMapColors();
        if (typeof updateCountyColors === "function") updateCountyColors();
        if (typeof updateRankings === "function") updateRankings();
        if (typeof updateBestCounty === "function") updateBestCounty();
    });

    // Automatic time-lapse animation (MODIFIED TO GO FORWARD)
    window.startTimeLapse = function(duration = 10000, pauseAtEnd = true) {
        let currentIndex = 0; // Start from the earliest year (index 0)
        let isPlaying = true;
        
        const animate = () => {
            if (!isPlaying) return;
            
            // Check if it reached the end of the years
            if (currentIndex >= yearsVar.length) {
                if (pauseAtEnd) {
                    isPlaying = false; // Stop if pauseAtEnd is true
                    return;
                }
                currentIndex = 0; // Loop back to the start
            }
            
            yearSlider.noUiSlider.set([yearsVar[currentIndex]]);
            
            currentIndex++; // Move forward to the next year
            
            setTimeout(animate, duration / yearsVar.length);
        };
        
        // Start animation after a short delay
        setTimeout(animate, 500);
        
        // Return stop function
        return () => { isPlaying = false; };
    };

    // Start time-lapse automatically when visualization loads
    setTimeout(() => window.startTimeLapse(12000, true), 1000);
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


function sliderChange(sliderId, states, mapDataState, countyAverages, divId, stateId) {
  const slider = document.querySelector(sliderId);
  if (!slider || !slider.noUiSlider) return;


  const state = mapDataState.filter(d => d.id == stateId);


  // full state name -> abbr
  let selectAb = "";
  for (let j = 0; j < states.length; j++) {
    const [key, value] = Object.entries(states[j]);
    if (key[0] === state[0].properties.name) selectAb = key[1];
  }
  const selectCounties = countyAverages.filter(d => d.State == selectAb);


  // Function to update county highlighting based on slider range
  const updateCountyHighlighting = function(values) {
    const min = +values[0] * 1000;
    const max = +values[1] * 1000;

    // Filter counties outside the range using current year
    const countiesOutRange = selectCounties.filter(d => {
      const yearVal = +d[String(userYear)];
      if (isNaN(yearVal) || yearVal <= 0) return false;
      const adjustedVal = adjustInflation ? adjustValueForInflation(yearVal, userYear) : yearVal;
      return adjustedVal < min || adjustedVal > max;
    });

    // Clear previous highlights
    d3.selectAll(divId).classed("highlight", false);
    
    // Highlight counties outside the range
    if (countiesOutRange.length !== 0) {
      const keys2 = countiesOutRange.map(d => d.County);
      d3.selectAll(divId)
        .filter(d => keys2.includes(d.properties.name + " County"))
        .classed("highlight", true);

      d3.selectAll(divId).classed("highlightState", false);
      d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();
    }
  };

  // Connect slider change event
  slider.noUiSlider.off('change');
  slider.noUiSlider.on('change', function (values) {
    updateCountyHighlighting(values);
  });

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
    }  


window.updateMapColors = updateMapColors;

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

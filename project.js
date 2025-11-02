
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


  const mapDataState = topojson.feature(topoUs, topoUs.objects.states).features;
  const countyAverages = calc_countyAverages(zillowDataAvg, states);


  const stateYearLookup = {};


  const years = (stateYearCsv.columns ? stateYearCsv.columns : Object.keys(stateYearCsv[0]))
    .filter(k => k !== "State")
    .map(y => +y);


  stateYearCsv.forEach(row => {
    const abbr = row.State;
    stateYearLookup[abbr] = {};
    years.forEach(y => stateYearLookup[abbr][y] = +row[y]);
  });


  createSlider("#linked-advanced .rec-class .Bcontainer .controls");        
  createYearSlider("#linked-advanced .rec-class .Bcontainer .controls-year", years);


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
      .sort((a, b) => b["2019"] - a["2019"]);


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
      (d3.hierarchy({ children: data }).sum(d => d["2019"]));


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
      leaf.append("title").text(d => `Average : ${format(d.data[2019])}`);
    }
  }
}


function createLegend(colorScale, divId, vertical, reverse) {
  const n = 512;
  const margin = 20;
  const rampWidth = 20;


  const container = d3.select(divId);
  const boundingRect = container.node().getBoundingClientRect();
  const width = boundingRect.width, height = boundingRect.height;


  const internalScale = colorScale.copy().domain([0, 1]);
  const canvas = d3.select(divId).append("canvas")
    .attr("width", vertical ? 1 : n)
    .attr("height", vertical ? n : 1)
    .style("width", (vertical ? rampWidth : width - 2 * margin) + "px")
    .style("height", (vertical ? height - 2 * margin : rampWidth) + "px")
    .style("margin-left", (vertical ? 20 : margin) + "px")
    .style("margin-top", (vertical ? margin : 0) + "px")
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
  const legendAxis = vertical ? d3.axisRight(legendScale) : d3.axisBottom(legendScale);


  d3.select(divId).append("svg")
    .attr("width", vertical ? width - rampWidth : width)
    .attr("height", vertical ? height : height - rampWidth)
    .append("g")
    .attr("transform", "translate(" + (vertical ? 0 : margin) + "," + (vertical ? margin : 0) + ")")
    .call(legendAxis);
}


function createLegendDiv(colorScale, divId, vertical = false, reverse = false, size = [400, 60]) {
  d3.select(divId).append("div")
    .attr("class", "legend")
    .style("width", (vertical ? size[1] : size[0]) + "px")
    .style("height", (vertical ? size[0] : size[1]) + "px")
    .style("display", "flex")
    .style("flex-direction", vertical ? "row" : "columns");


  createLegend(colorScale, divId + " .legend", vertical, reverse);
}


function createStateMap(topoUs, mapDataState, countyAverages, states, stateId, createBubble, zillowDataAvg) {
  const height = 300;
  const width = 300;
  const margin = { top: 0, bottom: 50, left: 100, right: 20 };


  d3.selectAll("#linked-advanced .map-container .us-map .states").classed("highlightState", false);
  const statePath = d3.selectAll("#linked-advanced .map-container .us-map .states").filter(d => d.id == stateId);
  statePath.classed("highlightState", !statePath.classed("highlightState"));


  d3.selectAll("#linked-advanced .rec-class .state-map svg ").remove();
  d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg ").remove();


  const svg = d3.select("#linked-advanced .rec-class .state-map").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  const tooltip = d3.select("#linked-advanced .rec-class .state-map").append("div")
    .attr('class', 'tooltip')
    .style('opacity', 0);


  const state = mapDataState.filter(d => d.id == stateId);


  let selectAb = "";
  for (let j = 0; j < states.length; j++) {
    const [key, value] = Object.entries(states[j]);
    if (key[0] === state[0].properties.name) selectAb = key[1];
  }


  const counties = topojson.feature(topoUs, topoUs.objects.counties).features
    .filter(d => d.id.slice(0, 2) === stateId.toString().padStart(2, '0')); // match FIPS prefix


  const projection = d3.geoAlbers()
    .precision(0)
    .scale(height * 2)
    .translate([width / 2, height / 2]);
  projection.fitExtent([[20, 20], [width - 20, height - 20]], { type: "FeatureCollection", features: counties });


  const path = d3.geoPath().projection(projection);


  function colorMapCounty(countyName) {
    const selectCounty = countyAverages.filter(d => d.State == selectAb && d.County == countyName);
    const color1 = d3.scaleSequential([0, 800000], d3.interpolateViridis);
    let color = "#d3d3d3";
    if (selectCounty.length === 1) color = color1(selectCounty[0]["2019"]);
    return color;
  }


  function tip_county(countyName) {
    const year = "2019";
    const selectCounty = countyAverages.filter(d => d.County == countyName && d.State == selectAb);
    const content =
      selectCounty.length === 1
        ? `State: ${state[0].properties.name}<br>${selectCounty[0].County}<br>Average: $${d3.format(",d")(selectCounty[0][year])}`
        : `State: ${state[0].properties.name}<br>${countyName}<br>No data`;
    tooltip.transition().duration(50).style("display", "inline").style('opacity', 0.9);
    tooltip.html(content).style('left', d3.event.pageX + 'px').style('top', d3.event.pageY - 28 + 'px');
  }


  svg.selectAll(".county")
    .data(counties)
    .enter().append("path")
    .attr("d", path)
    .attr("class", "county")
    .attr("stroke", "white")
    .attr("fill", d => colorMapCounty(d.properties.name + " County"))
    .on('mouseover', d => tip_county(d.properties.name + " County"))
    .on('mouseout', () => tooltip.transition().duration(500).style('opacity', 0))
    .on("click", d => createBubble(zillowDataAvg, mapDataState, states, d.properties.name + " County", d.id.slice(0, 2)))
    .transition().duration(1000);


  svg.append("text")
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


function createYearSlider(sliderId, years) {
  const slider = document.querySelector(sliderId);
  if (!slider || slider.noUiSlider) return;
  const minY = d3.min(years), maxY = d3.max(years);
  noUiSlider.create(slider, {
    start: [maxY],
    step: 1,
    connect: [true, false],
    range: { min: minY, max: maxY },
    pips: {
      mode: 'values',
      values: years.filter((d, i) => i % 2 === 0),
      density: 2
    }
  });
}


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


  slider.noUiSlider.off('change');
  slider.noUiSlider.on('change', function (values) {
    const min = +values[0] * 1000;
    const max = +values[1] * 1000;


    const countiesOutRange = selectCounties.filter(d => +d["2019"] < min || +d["2019"] > max);


    d3.selectAll(divId).classed("highlight", false);
    if (countiesOutRange.length !== 0) {
      const keys2 = countiesOutRange.map(d => d.County);
      d3.selectAll(divId)
        .filter(d => keys2.includes(d.properties.NAME + " County"))
        .classed("highlight", true);


      d3.selectAll(divId).classed("highlightState", false);
      d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();
    }
  });
}


function createUSMap(
  data, mapDataState, countyAverages, states,
  createStateMap, createBubble, zillowDataAvg,
  stateYearLookup, years
) {
  const height = 500;
  const width = 550;
  const margin = { top: 20, bottom: 50, left: 0, right: 20 };


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


  const color = d3.scaleSequential(d3.interpolateViridis);
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


  let currentYear = fixedLegendYear;
  d3.select("#linked-advanced .map-container .us-map .year-label").text("Year: " + currentYear);


  const statesSel = mapSvg.selectAll("path")
    .data(topojson.feature(data, data.objects.states).features)
    .enter().append("path")
    .attr("d", path)
    .attr("class", "states")
    .attr("stroke", "black")
    .on('mouseover', d => tip(d.properties.name, currentYear))
    .on('mouseout', () => { tooltip.transition().duration(500).style('opacity', 0); })
    .on('click', d => createStateMap(data, mapDataState, countyAverages, states, d.id, createBubble, zillowDataAvg))


    .attr("transform", "translate(0,40)")
    .attr("fill", d => colorMapState(d.properties.name, currentYear));


  const yearSlider = document.querySelector("#linked-advanced .rec-class .Bcontainer .controls-year");
  if (yearSlider && yearSlider.noUiSlider) {
    yearSlider.noUiSlider.off("update");
    yearSlider.noUiSlider.on("update", function (values) {
      const y = Math.round(+values[0]);
      if (y === currentYear) return;
      currentYear = y;
      d3.select("#linked-advanced .map-container .us-map .year-label").text("Year: " + currentYear);
      statesSel
        .on('mouseover', d => tip(d.properties.name, currentYear))
        .transition()
        .duration(400)
        .attr("fill", d => colorMapState(d.properties.name, currentYear));
    });
  }
    function updateMapColors() {
        const currentVals = Object.keys(stateYearLookup)
            .map(ab => {
                const val = stateYearLookup[ab][currentYear];
                if (isNaN(val)) return null;
                return adjustInflation ? adjustValueForInflation(val, currentYear) : val;
            })
            .filter(v => v !== null && !isNaN(v));


        const newMax = d3.max(currentVals) || 800000;
        color.domain([0, newMax]);

        statesSel.transition().duration(400)
            .attr("fill", d => colorMapState(d.properties.name, currentYear));
    }  


window.updateMapColors = updateMapColors;




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


function calc_countyAverages(zillowDataAvg, states) {
  const countyAverage = [];
  const grouped = groupBy(zillowDataAvg, d => (d.State));


  for (let j = 0; j < states.length; j++) {
    const [key, value] = Object.entries(states[j]);
    const c_names = grouped.get(key[1]);
    const grouped_byCounty = groupBy(c_names, d => d.CountyName);
    const county_grp = Array.from(grouped_byCounty);


    for (let i = 0; i < county_grp.length; i++) {
      let tot2019 = 0;
      for (let k = 0; k < county_grp[i][1].length; k++) {
        tot2019 = tot2019 + parseInt(county_grp[i][1][k]["2019"]);
      }


      countyAverage.push({
        "State": key[1], "County": county_grp[i][0],
        "2019": parseInt(tot2019 / county_grp[i][1].length)
      });
    }
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


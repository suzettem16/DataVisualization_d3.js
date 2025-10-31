function createVis(data) {
    let topoUs = data[0];
    let zillowDataRaw = data[1];
    let zillowDataAvg = data[2];
    let states = data[3];
    let statesTopoJson = data[4];
    
    let mapDataState = [];
    //Taking years as keys
    var keys = d3.keys(zillowDataRaw[0]).filter(function (key) {
        return key !== "State" && key !== "CountyName" && key !== "Metro" && key !== "RegionID" && key !== "SizeRank" && key !== "RegionName";
    });

    //Calculating state averages.
    var statesAverages = d3.nest()
        .key(function (d) { return d.State; })
        .rollup(function (leaves) {
            b = [];
            for (var prop in d3.entries(keys)) {
                b.push({
                    [keys[prop]]: d3.mean(leaves, function (d) {
                        return parseFloat(+d[keys[prop]]);
                    })
                })
            }
            var c = {};
            for (var i = 0; i < 281; i++) {
                c[keys[i]] = d3.entries(b[i])[0].value;
            }
            return c;
        })
        .entries(zillowDataRaw);
    
   
    mapDataState = topojson.feature(topoUs, topoUs.objects.states).features;

    var countyAverages = calc_countyAverages(zillowDataAvg, states);

    createUSMap(topoUs, mapDataState, countyAverages, states, statesAverages, createStateMap, statesTopoJson, createBubble, zillowDataAvg);
    createSlider("#linked-advanced .rec-class .Bcontainer .controls");
    createStateMap(statesTopoJson, mapDataState, countyAverages, states, stateId = '17', createBubble, zillowDataAvg);
    function createBubble(zillowDataAvg, mapDataState, states,selectedCounty,selectedState) {
        var state = mapDataState.filter(d => d.id == selectedState);
        
        var selectAb = "";
        for (var j = 0; j < states.length; j++) {
            let [key, value] = Object.entries(states[j]);
            if (key[0] == state[0]["properties"]["name"])
                selectAb = key[1]
        }
        
        var selectRegions = zillowDataAvg.filter(d => d.State == selectAb && d.CountyName == selectedCounty);
        selectRegions.sort(function (a, b) {
            return b["2019"] - a["2019"];
        });
        
        var selectedCountyPath = d3.selectAll("#linked-advanced .rec-class .state-map .county").filter(d => d.properties.NAME + " County" == selectedCounty);

            d3.selectAll("#linked-advanced .rec-class .state-map .county").classed("highlightState", false);

       
        var countyPath = d3.selectAll("#linked-advanced .rec-class .state-map .county").filter(d => d.properties.NAME + " County" == selectedCounty);
            if (countyPath.classed("highlightState") == false) {
                countyPath.classed("highlightState", true);
            }
            else {
                countyPath.classed("highlightState", false);
            }

            var height = 300;
            var width = 300;
            var margin = { top: 0, bottom: 50, left: 50, right: 20 };
            d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove()

            var svg = d3.select("#linked-advanced .Bubble-container-class .bubble-chart").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("font-size", 10)
                .attr("font-family", "sans-serif")
                .attr("text-anchor", "middle")
                .append("g") // add a group to translate everything according to margins
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            pack = data => d3.pack()
                .size([width - 2, height - 2])
                .padding(4)
                (d3.hierarchy({ children: data })
                    .sum(d => d["2019"]))
            const root = pack(selectRegions.slice(0, 10));
            if (selectRegions.length >= 1) {
                color = d3.scaleOrdinal(data.map(d => d.CountyName), d3.schemeCategory10)
                const leaf = svg.selectAll("g")
                    .data(root.leaves())
                    .join("g")
                    .attr("transform", d => `translate(${d.x + 1},${d.y + 1})`);

                leaf.append("circle")
                    .attr("id", d => (d.leafUid = document.getElementById("leaf")))//DOM.uid("leaf")).id)
                    .attr("r", d => d.r)
                    .attr("class", "cir")
                    .attr("fill-opacity", 0.7)
                    .attr("fill", d => color(d.data.RegionName));

                leaf.append("clipPath")
                    .attr("id", d => (d.clipUid = document.getElementById("clip")))
                    .append("use");

                leaf.append("text")
                    .attr("clip-path", d => d.clipUid)
                    .selectAll("tspan")
                    .data(d => d.data.RegionName.split(/(?=[A-Z][^A-Z])/g))//d.data.name.split(/(?=[A-Z][^A-Z])/g))
                    .join("tspan")
                    .attr("x", 0)
                    .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.6}em`)
                    .text(d => d);

                format = d3.format(",d"); var av = "Average : ";
                leaf.append("title")
                    .text(d => `${av}${format(d.data[2019])}`);
            }
        
    }
}
function createLegend(colorScale, divId, vertical, reverse) {
    const n = 512;
    const margin = 20;
    const rampWidth = 20;

    const container = d3.select(divId);

    const boundingRect = container.node().getBoundingClientRect();
    const width = boundingRect.width,
        height = boundingRect.height;

    const internalScale = colorScale.copy().domain([0, 1]);
    var canvas = d3.select(divId).append("canvas")
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
    legendAxis = vertical ? d3.axisRight(legendScale) : d3.axisBottom(legendScale);

    d3.select(divId).append("svg")
        .attr("width", vertical ? width - rampWidth : width)
        .attr("height", vertical ? height : height - rampWidth)
        .append("g")
        .attr("transform", "translate(" + (vertical ? 0 : margin) + "," + (vertical ? margin : 0) + ")")
        .call(legendAxis)
}

function createLegendDiv(colorScale, divId, vertical = false, reverse = false, size = [400, 60]) {
    const legendDiv = d3.select(divId).append("div")
        .attr("class", "legend")
        .style("width", (vertical ? size[1] : size[0]) + "px")
        .style("height", (vertical ? size[0] : size[1]) + "px")
        .style("display", "flex")
        .style("flex-direction", vertical ? "row" : "columns");

    createLegend(colorScale, divId + " .legend", vertical, reverse);
}
function createStateMap(statesTopoJson, mapDataState, countyAverages, states, stateId, createBubble, zillowDataAvg) {
    var height = 300;
    var width = 300;
    var margin = { top: 0, bottom: 50, left: 100, right: 20 };

    d3.selectAll("#linked-advanced .map-container .us-map .states").classed("highlightState", false);

    var statePath = d3.selectAll("#linked-advanced .map-container .us-map .states").filter(d => d.id == stateId);
    if (statePath.classed("highlightState") == false) {
        statePath.classed("highlightState", true);
    }
    else {
        statePath.classed("highlightState", false);
    }

    d3.selectAll("#linked-advanced .rec-class .state-map svg ").remove()
    d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg ").remove()

    var svg = d3.select("#linked-advanced .rec-class .state-map").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g") // add a group to translate everything according to margins
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var tooltip = d3.select("#linked-advanced .rec-class .state-map").append("div")
        .attr('class', 'tooltip')
        .style('opacity', 0);
    var state = mapDataState.filter(d => d.id == stateId);

    var selectAb = "";
    for (var j = 0; j < states.length; j++) {
        let [key, value] = Object.entries(states[j]);
        if (key[0] == state[0]["properties"]["name"])
            selectAb = key[1]
    }
    function colorMapCounty(county, stateId) {

        var selectCounty = countyAverages.filter(d => d.State == selectAb && d.County==county);

        var color1 = d3.scaleSequential([0, 800000], d3.interpolateViridis);//);

        var color = "#d3d3d3";//"#d3d3d3";
        if (selectCounty.length == 1) {
            color= color1(selectCounty[0]["2019"]);
        }

        return color;
    }
    function tip_county(county, stateId) {
        
        var year = "2019";


        var selectCounty = countyAverages.filter(d => (d.County == county && d.State == selectAb));

        if (selectCounty.length == 1) {
            var content = "State:" + state[0]["properties"]["name"] + "<br>" +
                selectCounty[0]["County"] + "<br>" + "Average : $" + d3.format(",d")(selectCounty[0][year]);

        }
        else {
            var content = "State:" + state[0]["properties"]["name"] + "<br>" +
                county + "<br>" + "No data";
        }
        tooltip
            .transition()
            .duration(50)
            .style("display", "inline")
            .style('opacity', 0.9);
        tooltip
            .html(content)//d.properties.NAME10)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 28 + 'px');

    }

    d3.json(statesTopoJson[stateId]).then(function (state) {
        key = d3.keys(state.objects);
        var counties = topojson.feature(state, state.objects[key[0]]);
       
        var countyPaths = svg.selectAll(".county")
            .data(topojson.feature(state, state.objects[key[0]]).features)//stateCounties, function (d) { return d.id });

        var projection = d3.geoAlbers()
            .precision(0)
            .scale(height * 2)
            .translate([width / 2, height / 2])

        projection.fitExtent(
            [[20, 20], [width - 20, height - 20]],
            counties
        )
        

        var path = d3.geoPath().projection(projection);
        var enterCountyPaths = countyPaths.enter().append('path')
            .attr("d", path)
            .attr("class", "county")
            .attr("stroke", "white")
            .attr("fill", d => colorMapCounty(d.properties.NAME + " County", d.properties.STATEFP))
            .on('mouseover', d => tip_county(d.properties.NAME + " County", d.properties.STATEFP))
            .on('mouseout', () => {
                tooltip
                    .transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .on("click", d => createBubble(zillowDataAvg, mapDataState, states, d.properties.NAME + " County", d.properties.STATEFP))
            .transition()
            .duration(2000);
    }
    );


    svg.append("text")
        .attr("class", "label_text")
        .attr("x", width -80)
        .attr("y",  15)
        .text(state[0]["properties"]["name"])
        .raise();
    sliderChange("#linked-advanced .rec-class .Bcontainer .controls",states, mapDataState, countyAverages, "#linked-advanced .rec-class .state-map .county", stateId)

}

function createSlider(sliderId) {
    var slider = document.querySelector(sliderId);
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
        pips: {
            mode: 'steps',
            stepped: true,
            density: 4
        }
    });
}

function sliderChange(sliderId,states, mapDataState, countyAverages,divId, stateId) {

    var slider = document.querySelector(sliderId);
    var state = mapDataState.filter(d => d.id == stateId);

    var selectAb = "";
    for (var j = 0; j < states.length; j++) {
        let [key, value] = Object.entries(states[j]);
        if (key[0] == state[0]["properties"]["name"])
            selectAb = key[1]
    }
    var selectCounties = countyAverages.filter(d => d.State == selectAb);
   
    slider.noUiSlider.on('change', function (values, handle) {

        var countiesOutRange = selectCounties.filter(d => +d["2019"] < values[0] * 1000 || +d["2019"] > values[1] * 1000);
       
        d3.selectAll(divId).classed("highlight", false);
        if (countiesOutRange.length !=0) {
           
            keys2 = [];
            for (var prop in countiesOutRange)
                keys2.push(countiesOutRange[prop].County);

            function check(name) {
                c = keys2.filter(e => e == name);
                if (c.length == 1)
                    return true
            }

            d3.selectAll(divId).filter(d => check(d.properties.NAME + " County")).classed("highlight", true);
            d3.selectAll(divId).classed("highlightState", false);
            d3.selectAll("#linked-advanced .Bubble-container-class .bubble-chart svg").remove();
        }

    });
}
function createUSMap(data, mapDataState, countyAverages, states, stateAverages, createStateMap, statesTopoJson, createBubble, zillowDataAvg) {


    var height = 500;
    var width = 550;
    var margin = { top: 20, bottom: 50, left: 0, right: 20 };

    d3.selectAll("#linked-advanced .map-container .us-map svg ").remove()
    var mapSvg = d3.select("#linked-advanced .map-container .us-map").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g") // add a group to translate everything according to margins
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var tooltip = d3.select("#linked-advanced .map-container .us-map").append("div")
        .attr('class', 'tooltip')
        .style('opacity', 0);
    var color = d3.scaleSequential([0, 800000], d3.interpolateViridis);
    createLegendDiv(color, "#linked-advanced .map-container .us-map", true, true, size = [360, 100]);
    
        var year = "2019-08";      
        
        function tip(state) {
            var selectAb = "";
            for (var j = 0; j < states.length; j++) {
                let [key, value] = Object.entries(states[j]);
                if (key[0] == state)
                    selectAb = key[1]
            }
            var selectState = stateAverages.filter(d => (d.key == selectAb));
            if (selectState.length == 1) {
                var content = "State:" + state + "<br>" +
                    "Average In 2019 : $" + d3.format(",d")(selectState[0].value[year]);
            }
            else { var content = "No Data"; }


            tooltip
                .transition()
                .duration(100)
                .style("display", "inline")
                .style('opacity', 0.9);
            tooltip
                .html(content)//d.properties.NAME10)
                .style('left', d3.event.pageX + 'px')
                .style('top', d3.event.pageY - 28 + 'px');

        }
        function colorMapState(state) {
            var selectAb = "";
            for (var j = 0; j < states.length; j++) {
                let [key, value] = Object.entries(states[j]);
                if (key[0] == state)
                    selectAb = key[1]
            }
            var selectState = stateAverages.filter(d => (d.key == selectAb));
            var color1 = d3.scaleSequential([0, 800000], d3.interpolateViridis);
            var color = "#FFFF00";//"#d3d3d3";
            if (selectState.length == 1) {
                color = color1(selectState[0].value[year] );
            }
            return color;
        }
    
    function scale(scaleFactor) {
        return d3.geoTransform({
            point: function (x, y) {
                this.stream.point(x * scaleFactor, y * scaleFactor);
            }
        });
    }
    var path = d3.geoPath().projection(scale(0.6));

        mapSvg.selectAll("path")
            .data(topojson.feature(data, data.objects.states).features)
            .enter().append("path")
            .attr("d", path)
            .attr("class", "states")
            .attr("stroke", "black")
            .on('mouseover', d => tip(d.properties.name))//d.properties.STUSPS10

            .on('mouseout', () => {
                tooltip
                    .transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .on('click', d => createStateMap(statesTopoJson, mapDataState, countyAverages, states, d.id, createBubble, zillowDataAvg))
            .attr("transform", "translate(0,40)")
            .transition()
            .duration(2000)
            .attr("fill", d => colorMapState(d.properties.name));
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
    var countyAverage = [];
    var grouped = groupBy(zillowDataAvg, d => (d.State));


    for (var j = 0; j < states.length; j++) {
        let [key, value] = Object.entries(states[j]);
        let c_names = grouped.get(key[1]);
        var grouped_byCounty = groupBy(c_names, d => d.CountyName);
        let county_grp = Array.from(grouped_byCounty)
        var tot2019 = 0;

        for (var i = 0; i < county_grp.length; i++) {
            var tot2019 = 0;
            for (var k = 0; k < county_grp[i][1].length; k++) {
                tot2019 = tot2019 + parseInt(county_grp[i][1][k]["2019"]);
            }

            countyAverage.push({
                "State": key[1], "County": county_grp[i][0],
                "2019": parseInt(tot2019 / county_grp[i][1].length)
            })
        }

    }
    return countyAverage;

}

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json"),
d3.csv("https://raw.githubusercontent.com/PSdiv/zillow/master/City_Zhvi_AllHomes.csv"),
d3.csv("https://raw.githubusercontent.com/PSdiv/zillow/master/City_Zhvi_AllHomes_yearAvrg1.csv"),
    d3.json("https://raw.githubusercontent.com/PSdiv/zillow/master/statesAbbreviation"),
    d3.json("https://raw.githubusercontent.com/PSdiv/zillow/master/StateCountiesTopoJsons")])
    .then(createVis);

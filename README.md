# Data Visualization project
Zillow is an American online real estate database company. It provides datasets publicly on their
website for research purposes. The data used for this project is US home values from 1996 to 2019. It is
25mb data set with 287 columns 13237 rows.

This project aims at visualizing Home pricing trends in United States for the past 23 years and
also giving brief insight of states and counties level home pricings as of today. This is interactive
visualization project which allows users to interact with visualization at every step. Allowing the user to
select filters and drill down into data from particular states/regions. 

# Technologies used: 
javascript, HTML, CSS, D3.js, JQuery

# Attributes:
Categorical: Region Name, State, County
Ordinal : Years
Quantitative: Price

# Questions my visualization answers:
• Over View - What are the trends in Home values in US from 1996 to 2019?
• Are there any spatial trends?
• Home prices at Regions of Counties?
• Investigate Home prices starting from Country to Regions

# Design Choices:
## Design 1:
To show trends in data over number of years I have considered multi line chart with X axis as
years and Y axis as prices in dollars. After drawing the line chart, I realized there is visual clutter. To
overcome this, I have included line mouse hover- highlight for each line on the graph. When user mouse
hover any particular line it highlights that line and reduces the remaining lines color opacity. And also, I
have implemented a tool tip which shows what is the average price for that particular state on that
hovered year. I also wanted to give some easiest way to select lines instead searching the state from
bunch of lines that is legend mouse hover-highlight. I have created a legend with state names, user can
mouse hover and select that particular state from the list of states and eventually highlight the state in
Line graph. I have also created feedback for legend text by displaying it in X large size with mouse hover.
Marks : Line marks

## Design 2:
To show Spatial trends in Home prices I have considered choropleth map of US with states view.
Color encoding is given to states based on their average price in Year 2019. I have used sequential multi
hue color scale encoding for the states. Legend is created to show the color scale range. I have also
implemented tooltip for each state with states average price shown by mouse hover.
Marks: Area
Channels: Color saturation(sequential multi hue color scale)

## Design 3:
To show county level information of home values I have created an Interactive design. By
clicking on US map state, the corresponding states county map will be generated dynamically and shows
juxta positioned to US choropleth map. The same sequential color encoding is given here as well for
counties. To filter counties based on their home prices I have added a slider. On changing the slider
counties will be filtered out and only the counties which fall in that slider range will be highlighted.
Marks: Area
Channels: Color saturation (sequential multi hue color scale)

## Design 4:
To visualize home value trends at regions I have crated a bubble chart. Each bubble represents a
county and size of the bubble is Its home value. This is also an Interactive visualization. By clicking on
county from design 2 generates bubble chart of regions dynamically. As there are more than hundred
regions in some counties, I have sorted them and used only top 10 highest prices regions to show as
bubbles.
Marks: Area
Channels: size of the bubble, Color Hue

# Coding Techniques Involved in this project:
1. The data set has home prices for different regions It doesn’t provide average prices for states and
counties as there are many regions in each county. To calculate state averages I have used d3.nest
with rollup.
2. Generating each states county map takes to load GEOJson files, but loading 50 GEOJsons for 50
states in promises was taking more time, to avoid this I have implemented dynamic loading of
files from GitHub. As soon as user clicks on state It goes to web and loads that states county map
GEOJson.

References:
https://observablehq.com/@d3/multi-line-chart
https://observablehq.com/@d3/bubble-chart

# PS: 
To execute this code, you just need to download project.html, project.js files to your local machine and open project.html in your browser or just double click to open it on your default browser. Please place both the files in same folder.

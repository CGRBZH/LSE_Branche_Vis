d3.formatDefaultLocale({
  decimal: ",",
  thousands: "'",
  grouping: [3],
  currency: ["", "\u00a0CHF"],
});
d3.timeFormatDefaultLocale({
  dateTime: "%A, der %e. %B %Y, %X",
  date: "%d.%m.%Y",
  time: "%H:%M:%S",
  periods: ["vormittags", "nachmittags"],
  days: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  shortDays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  months: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  shortMonths: [
    "Jan",
    "Feb",
    "Mrz",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ],
});

d3.csv("https://raw.githubusercontent.com/CGRBZH/LSE_Branche_Vis/master/LSE2018_Branche.csv").then((csv) => {
  const data = csv.map((d) => ({
    industry: d.Branche,
    man: +d.Männer,
    woman: +d.Frauen,
    payGap: (+d.Männer - +d.Frauen) / +d.Männer,
  }));
  let sortedData;

  const container = d3.select("body").append("div").attr("class", "container");
  const tooltip = d3.select("body").append("div").attr("class", "tooltip");
  // Sort
  const sortOptions = [
    { property: "industry", order: "ascending", text: "Branche" },
    { property: "man", order: "descending", text: "Männer" },
    { property: "woman", order: "descending", text: "Frauen" },
    { property: "payGap", order: "descending", text: "Lohnunterschied" },
  ];
  let selectedSortOptionIndex = 3;

  const sortContainer = container.append("div").attr("class", "sort-container");
  sortContainer.append("label").text("Sortieren nach ");
  sortContainer
    .append("select")
    .on("change", function () {
      selectedSortOptionIndex = +this.value;
      sortData();
      render(false); // Changer sort order can benefit from transition to see how industrys' order changes
    })
    .selectAll("option")
    .data(sortOptions)
    .join("option")
    .attr("selected", (d, i) => i === selectedSortOptionIndex)
    .attr("value", (d, i) => i)
    .text((d) => d.text);

  function sortData() {
    const option = sortOptions[selectedSortOptionIndex];
    sortedData = data.slice().sort((a, b) => {
      const aValue = a[option.property];
      const bValue = b[option.property];
      return d3[option.order](aValue, bValue);
    });
  }

  // Legend
  const legendOptions = [
    { text: "Frauen", property: "woman", color: "#e15759" },
    { text: "Männer", property: "man", color: "#4e79a7" },
  ];

  const color = d3
    .scaleOrdinal()
    .domain(legendOptions.map((d) => d.property))
    .range(legendOptions.map((d) => d.color));

  const legend = container.append("div").attr("class", "swatches");

  const swatch = legend
    .selectAll(".swatch")
    .data(legendOptions)
    .join("span")
    .attr("class", "swatch")
    .style("--fill-color", (d) => color(d.property))
    .text((d) => d.text);

  // Chart
  let width, svgWidth;
  const margin = { top: 30, right: 20, bottom: 10, left: 250 };
  const rowHeight = 28;
  const height = data.length * rowHeight;
  const svgHeight = height + margin.top + margin.bottom;
  const dotRadius = 5;

  const transitionDuration = 750;

  const x = d3
    .scaleLinear()
    .domain(d3.extent([...data.map((d) => d.man), ...data.map((d) => d.woman)]))
    .nice();

  const y = d3.scaleBand().domain(d3.range(data.length)).range([0, height]);

  const svg = container.append("svg").attr("height", svgHeight);
  // Top g group contains column title and x axis
  const gTop = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`);
  const gColumnTitles = gTop.append("g").attr("transform", `translate(0,10)`);
  const columnTitles = [
    { text: "Branche", textAnchor: "start", x: -margin.left },
    { text: "Lohnunterschied (%)", textAnchor: "end", x: -12 },
    { text: "Medianlohn (CHF)", textAnchor: "end", x: 0 },
  ];
  const gXAxis = gTop
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${margin.top})`);
  // Main g group containers rows of industries
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
  // Bottom g group contains x axis
  const gBottom = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top + height})`);

  function render(withoutTransition) {
    // Column titles
    gColumnTitles
      .selectAll("text")
      .data(columnTitles)
      .join("text")
      .attr("class", "column-title")
      .attr("text-anchor", (d) => d.textAnchor)
      .attr("x", (d) => d.x)
      .text((d) => d.text);

    // X axis
    gXAxis
      .call(
        d3
          .axisTop(x)
          .ticks(width / 60)
          .tickSizeInner(-height)
      )
      .select(".domain")
      .remove();

    gBottom
      .call(
        d3
          .axisBottom(x)
          .ticks(width / 60)
          .tickSizeInner(0)
      )
      .select(".domain")
      .remove();

    // industry column
    g.selectAll(".industry-name")
      .data(sortedData, (d) => d.industry)
      .join("text")
      .attr("class", "industry-name")
      .attr("y", rowHeight / 2)
      .text((d) => d.industry)
      .call(wrap)
      .transition()
      .duration(withoutTransition ? 0 : transitionDuration)
      .attr("transform", (d, i) => `translate(${-margin.left},${y(i)})`);

    // Pay gap value column
    g.selectAll(".pay-gap-value")
      .data(sortedData, (d) => d.industry)
      .join("text")
      .attr("class", "pay-gap-value")
      .attr("text-anchor", "end")
      .attr("y", rowHeight / 2)
      .attr("dy", "0.32em")
      .attr("fill", (d) => (d.payGap > 0 ? color("man") : color("woman")))
      .text((d) => d3.format(".1%")(d.payGap))
      .transition()
      .duration(withoutTransition ? 0 : transitionDuration)
      .attr("transform", (d, i) => `translate(-12,${y(i)})`);

    // Pay gap chart column
    g.selectAll(".pay-gap-chart")
      .data(sortedData, (d) => d.industry)
      .join(
        // Enter
        (enter) =>
          enter
            .append("g")
            .attr("class", "pay-gap-chart")
            .call((g) =>
              // Invisible rect to capture hover
              g
                .append("rect")
                .attr("class", "hover-rect")
                .attr("x", -dotRadius)
                .attr("height", rowHeight)
                .attr("fill", "#DCDCDC")
                .attr("fill-opacity", 0)
                .on("mouseenter", function (d) {
                  d3.select(this).attr("fill-opacity", 0.5);
                  showTooltip(d);
                })
                .on("mouseleave", function (d) {
                  d3.select(this).attr("fill-opacity", 0);
                  hideTooltip();
                })
                .on("mousemove", moveTooltip)
            )
            .call((g) =>
              g
                .append("line")
                .attr("y1", rowHeight / 2)
                .attr("y2", rowHeight / 2)
                .attr("class", "pay-gap-link")
                .attr("stroke", "#aaa")
            )
            .call((g) =>
              g
                .append("circle")
                .attr("class", "man-pay-circle")
                .attr("r", dotRadius)
                .attr("cy", rowHeight / 2)
                .attr("fill", color("man"))
            )
            .call((g) =>
              g
                .append("circle")
                .attr("class", "woman-pay-circle")
                .attr("r", dotRadius)
                .attr("cy", rowHeight / 2)
                .attr("fill", color("woman"))
            )
      )
      // Merge
      .call((g) => g.select(".hover-rect").attr("width", width + dotRadius * 2))
      .call((g) =>
        g
          .select(".pay-gap-link")
          .attr("x1", (d) => x(d.man))
          .attr("x2", (d) => x(d.woman))
      )
      .call((g) => g.select(".man-pay-circle").attr("cx", (d) => x(d.man)))
      .call((g) => g.select(".woman-pay-circle").attr("cx", (d) => x(d.woman)))
      .transition()
      .duration(withoutTransition ? 0 : transitionDuration)
      .attr("transform", (d, i) => `translate(0,${y(i)})`);
  }

  sortData();
  resize();
  window.addEventListener("resize", resize);

  function resize() {
    svgWidth = container.node().clientWidth;
    width = svgWidth - margin.left - margin.right;
    columnTitles[columnTitles.length - 1].x = width;
    x.range([0, width]);
    svg.attr("width", svgWidth);
    render(true); // There's no need for transition during resize
  }

  // Tooltip
  let tooltipBox;
  function showTooltip(d) {
    let content = `
      <div>${d.industry}</div>
      <div>Frauen verdienen <span style="color: ${
        d.payGap > 0 ? color("man") : color("woman")
      }">${d3.format(".1%")(Math.abs(d.payGap))} ${
      d.payGap > 0 ? "weniger" : "mehr"
    }</span> als Männer</div>
      <div>Frauen: <span style="color: ${color("woman")}">${d3.format(",d")(
      d.woman
    )} CHF</span></div>
      <div>Männer: <span style="color: ${color("man")}">${d3.format(",d")(
      d.man
    )} CHF</span></div>
    `;
    tooltip.html(content).transition().style("opacity", 1);
    tooltipBox = tooltip.node().getBoundingClientRect();
  }

  function hideTooltip() {
    tooltip.transition().style("opacity", 0);
  }

  function moveTooltip() {
    let left = d3.event.pageX - tooltipBox.width / 2;
    // Avoid tooltip going off the right side of the screen
    if (left + tooltipBox.width > window.innerWidth) {
      left = window.innerWidth - tooltipBox.width;
    }
    let top = d3.event.pageY - tooltipBox.height - 5;
    tooltip.style("transform", `translate(${left}px,${top}px)`);
  }

  // Wrap long text into two lines
  function wrap(text) {
    const maxWidth = margin.left - 50;
    text.each(function () {
      if (this.getBBox().width > maxWidth) {
        const str = d3.select(this).text();
        // Find the space in the string to break in up into two
        var middle = Math.floor(str.length / 2);
        const before = str.lastIndexOf(" ", middle);
        const after = str.indexOf(" ", middle + 1);
        if (middle - before < after - middle) {
          middle = before;
        } else {
          middle = after;
        }
        const strs = [str.substr(0, middle), str.substr(middle + 1)];
        d3.select(this)
          .text("")
          .selectAll("tspan")
          .data(strs)
          .join("tspan")
          .attr("x", 0)
          .attr("dy", (d, i) => {
            if (i === 0) {
              return "-0.32em";
            } else {
              return "1.1em";
            }
          })
          .text((d) => d);
      } else {
        d3.select(this).attr("dy", "0.32em");
      }
    });
  }
});

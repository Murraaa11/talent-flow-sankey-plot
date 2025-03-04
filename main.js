var margin = {top: 80, right: 50, bottom: 80, left: 50},
    width = 1200 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

var formatNumber = d3.format(",.0f"),
    format = function(d) { return formatNumber(d); };

var color = d3.scale.ordinal()
.domain(["CANADA", 
    "HONG KONG", 
    "MAINLAND CHINA", 
    "GERMANY", 
    "UNITED KINGDOM", 
    "INDIA", 
    "JAPAN", 
    "SINGAPORE", 
    "UNITED STATES", 
    "SOUTH KOREA", 
    "AUSTRALIA",
    "OTHER"])
.range([
    "#E57373",  // CHINA - 粉红色
    "#4A90E2",  // USA - 蓝色
    "#F5A623",  // OTHER - 橙色
    "#7986CB",  // INDIA - 蓝灰色
    "#81C784",   // 新添加的颜色 - 绿色
    "#4DB6AC",  // AUSTRALIA - 青色
    "#A5D6A7",  // UK - 浅绿色
    "#80DEEA",  // SOUTH KOREA - 浅蓝色
    "#9575CD",  // EUROPE - 紫色
    "#FFE0B2",  // RUSSIA - 浅橙色
    "#4A90E2",  // NO GRAD SCHOOL - 蓝色
    "#B0BEC5",  // CANADA - 灰色
]);

var svg = d3.select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var sankey = d3.sankey()
    .nodeWidth(25)
    .nodePadding(10)
    .size([width, height]);

var path = sankey.link();

var freqCounter = 1;

const scaleValue = 100;


d3.json("talent.json", function(energy) {

  sankey
      .nodes(energy.nodes)
      .links(energy.links)
      .layout(32);

  var tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  var link = svg.append("g").selectAll(".link")
      .data(energy.links)
    .enter().append("path")
      .attr("class", "link")
      .attr("d", path)
      .style("stroke-width", function(d) { return Math.max(1, d.dy); })
      .sort(function(a, b) { return b.dy - a.dy; })
      .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(d.source.name.replace(/\_.*/, "") + " → " + d.target.name.replace(/\_.*/, "") + "<br/>" + format(d.value*scaleValue))
                .style("left", (d3.event.pageX + 10) + "px")     // 偏移10像素，避免遮挡鼠标
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mousemove", function(d) {               // 添加 mousemove 事件处理
            tooltip
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });


  var node = svg.append("g").selectAll(".node")
      .data(energy.nodes)
    .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
    .call(d3.behavior.drag() // 添加拖拽行为
      .origin(function(d) { return d; })
      .on("dragstart", function() { this.parentNode.appendChild(this); })
      .on("drag", dragmove));

    // 添加年份标签
  svg.append("text")
    .attr("x", 0)
    .attr("y", -20)  // 位置在最上方
    .attr("text-anchor", "start")
    .style("font-size", "20px")
    .style("font-weight", "500") 
    .text("2019");  // 左侧年份

    svg.append("text")
    .attr("x", width)
    .attr("y", -20)  // 位置在最上方
    .attr("text-anchor", "end")
    .style("font-size", "20px")
    .style("font-weight", "500") 
    .text("2023");  // 右侧年份

  node.append("rect")
      .attr("height", function(d) { return d.dy; })
      .attr("width", sankey.nodeWidth())
      .style("fill", function(d) { return d.color = color(d.name.replace(/\_ .*/, "")); })
      .style("stroke", "none")
    .append("title")
      .text(function(d) { return d.name + "\n" + format(d.value); });

  node.append("text")
      .attr("x", -6)
      .attr("y", function(d) { return d.dy / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      .text(function(d) { return d.name.replace(/\_.*/, ""); })
    .filter(function(d) { return d.x < width / 2; })
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");

  function dragmove(d) {
    d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
    sankey.relayout();
    link.attr("d", path);
  }

  var linkExtent = d3.extent(energy.links, function (d) {return d.value});
  var frequencyScale = d3.scale.linear().domain(linkExtent).range([0.01,0.1]); //控制粒子密度
  var particleSize = d3.scale.linear().domain(linkExtent).range([1,5]);


  energy.links.forEach(function (link) {
    link.freq = frequencyScale(link.value);
    link.particleSize = 2; //控制粒子大小
    link.particleColor = d3.scale.linear().domain([0,1])
    .range([link.source.color, link.target.color]);
  })

  var t = d3.timer(tick, 1000);
  var particles = [];

  function tick(elapsed, time) {

    particles = particles.filter(function (d) {return d.current < d.path.getTotalLength()});

    d3.selectAll("path.link")
    .each(
      function (d) {
//        if (d.freq < 1) {
          var offset = (Math.random() - .5) * d.dy;
          if (Math.random() < d.freq) {
            var length = this.getTotalLength();
            particles.push({link: d, time: elapsed, offset: offset, path: this, length: length, animateTime: length})
          }
//        }
/*        else {
          for (var x = 0; x<d.freq; x++) {
            var offset = (Math.random() - .5) * d.dy;
            particles.push({link: d, time: elapsed, offset: offset, path: this})
          }
        } */
      });

    particleEdgeCanvasPath(elapsed);
  }

  function particleEdgeCanvasPath(elapsed) {
    var context = d3.select("canvas").node().getContext("2d")

    //将 canvas 上下文的原点移动到与 SVG 相同的位置
    context.setTransform(1, 0, 0, 1, margin.left, margin.top);
    context.clearRect(-margin.left, -margin.top, width + margin.left + margin.right, height + margin.top + margin.bottom);

    // context.clearRect(0,0,1000,1000);

    //   context.fillStyle = "gray";
    //   context.lineWidth = "1px";
    for (var x in particles) {
        var currentTime = elapsed - particles[x].time;
//        var currentPercent = currentTime / 1000 * particles[x].path.getTotalLength();
        particles[x].current = currentTime * 0.10; //控制粒子速度
        var currentPos = particles[x].path.getPointAtLength(particles[x].current);
        context.beginPath();
        context.fillStyle = particles[x].link.particleColor(particles[x].current/particles[x].path.getTotalLength());
        context.arc(currentPos.x,currentPos.y + particles[x].offset,particles[x].link.particleSize,0,2*Math.PI);
        context.fill();
    }
  }

});
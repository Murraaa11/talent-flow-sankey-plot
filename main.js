//变量定义
let particles = [];
let timer;
let nodes, links;
let sankey, path;
let gNodes, gLinks;
let chartWidth, width;

//参数设定
const chartHeight = 800;
const margin = {top: 40, right: 10, bottom: 40, left: 10};

// const freqCounter = 1;
const scaleValue = 100; //数值缩放大小
const nodeWidth = 25; //节点宽度
const nodePadding = 10; //节点间距
const particleSize = 2; //粒子大小
const globalAlpha = 0.8; //粒子透明度
const particleSpeed = 0.1; //控制粒子速度


const dpr = window.devicePixelRatio || 1;

const container = d3
  .select(".chart-wrapper")
  .style("height", `${chartHeight}px`)

const svg = container.append("svg")
  .attr("height", chartHeight)

const canvas = container.append("canvas")
  .attr("height", chartHeight * dpr)
  .style("pointer-events", "none");  // 添加这行，使 canvas 不接收鼠标事件;

const context = canvas.node().getContext("2d");

const formatNumber = d3.format(",.0f");
const format = function(d) { return formatNumber(d); };



const color = d3.scaleOrdinal()
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

// const color = d3.scaleOrdinal()
// .domain(['Beijing',
//     'Berlin',
//     'Hong Kong',
//     'London',
//     'Madrid',
//     'Melbourne',
//     'Milan',
//     'New York',
//     'Other',
//     'Paris',
//     'Seoul',
//     'Shanghai',
//     'Singapore',
//     'Stockholm',
//     'Sydney',
//     'Tokyo'])
// .range([
//     "#E57373",  // CHINA - 粉红色
//     "#4A90E2",  // USA - 蓝色
//     "#F5A623",  // OTHER - 橙色
//     "#7986CB",  // INDIA - 蓝灰色
//     "#81C784",   // 新添加的颜色 - 绿色
//     "#4DB6AC",  // AUSTRALIA - 青色
//     "#A5D6A7",  // UK - 浅绿色
//     "#80DEEA",  // SOUTH KOREA - 浅蓝色
//     "#9575CD",  // EUROPE - 紫色
//     "#FFE0B2",  // RUSSIA - 浅橙色
//     "#4A90E2",  // NO GRAD SCHOOL - 蓝色
//     "#B0BEC5",  // CANADA - 灰色
//     "#BA68C8",  // 新增 - 紫罗兰色
//     "#FF8A65",  // 新增 - 珊瑚色
//     "#90A4AE",  // 新增 - 蓝灰色
//     "#DCE775"   // 新增 - 柠檬绿色
// ]);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

window.addEventListener("resize", resize);

// Init
d3.json("talent_country_flow.json").then((data) => {
  ({ nodes, links } = processData(data));
  resize();
  const linkExtent = d3.extent(links, function (d) {return d.value});
  const frequencyScale = d3.scaleLinear().domain(linkExtent).range([0.01,0.2]); //控制粒子密度
  // const particleSize = d3.scaleLinear().domain(linkExtent).range([1,5]);

  links.forEach(function (link) {
    link.freq = frequencyScale(link.value);
    console.log(link.freq);
    link.particleSize = particleSize;
    link.particleColor = d3.scaleLinear().domain([0,1])
    .range([link.source.color, link.target.color]);
  })
  timer = d3.timer(tick, 1000);
});


function processData(data) {
  return { nodes: data.nodes, links: data.links };
}

function resize() {
  chartWidth = container.node().clientWidth;
  width = chartWidth - margin.left - margin.right;

  canvas.attr("width", chartWidth * dpr);
  context.scale(dpr, dpr);

  svg.attr("width", chartWidth);

  drawStaticSVG();
}

function drawStaticSVG() {
  sankey = d3.sankey()
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .size([width, chartHeight - margin.top - margin.bottom])
    .nodes(nodes)
    .links(links)
    .layout(32);

  // 清除之前的内容
  svg.selectAll("*").remove();

  // 将整个 Sankey 图向下移动
  const sankeyG = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
  // 添加年份标签 - 移到最前面
  svg.append("text")
    .attr("x", margin.left)  // 考虑左边距
    .attr("y", margin.top - 20)  // 考虑上边距
    .attr("text-anchor", "start")
    .style("font-size", "20px")
    .style("font-weight", "500") 
    .text("2019");

  svg.append("text")
    .attr("x", width + margin.left)  // 考虑左边距
    .attr("y", margin.top - 20)  // 考虑上边距
    .attr("text-anchor", "end")
    .style("font-size", "20px")
    .style("font-weight", "500") 
    .text("2023");

  path = sankey.link();

  gLinks = sankeyG.append("g").selectAll(".link")
      .data(links)
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


  gNodes = sankeyG.append("g").selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
  .call(d3.drag() // 添加拖拽行为
    .subject(function(d) { return d; })  // .origin() 改为 .subject()
    .on("start", function(d) { this.parentNode.appendChild(this); })  // dragstart 改为 start
    .on("drag", dragmove));
    

  gNodes.append("rect")
    .attr("height", function(d) { return d.dy; })
    .attr("width", sankey.nodeWidth())
    .style("fill", function(d) { return d.color = color(d.name.replace(/\_ .*/, "")); })
    .style("stroke", "none")
  .append("title")
    .text(function(d) { return d.name + "\n" + format(d.value); });

  gNodes.append("text")
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
    // 获取相对于 SVG 的鼠标位置
    const mouseY = d3.event.y;
    
    // 计算新的 y 位置，考虑边距
    const newY = Math.max(
      0,
      Math.min(chartHeight - margin.top - margin.bottom - d.dy, mouseY)
    );
    
    // 更新节点位置
    d3.select(this)
      .attr("transform", `translate(${d.x},${newY})`);
    
    // 更新节点的 y 坐标
    d.y = newY;
    
    // 重新计算布局并更新连接
    sankey.relayout();
    gLinks.attr("d", path);
  }


}

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

  //将 canvas 上下文的原点移动到与 SVG 相同的位置
  // context.setTransform(1, 0, 0, 1, margin.left, margin.top);
  // context.clearRect(-margin.left, -margin.top, width + margin.left + margin.right, chartHeight + margin.top + margin.bottom);
  context.setTransform(1, 0, 0, 1, 0, 0);
  // 清除整个画布
  context.clearRect(0, 0, chartWidth * dpr, chartHeight * dpr);
  // 设置与 sankeyG 相同的变换
  context.translate(margin.left, margin.top);
  context.globalAlpha = globalAlpha;

  // context.clearRect(0,0,1000,1000);

  //   context.fillStyle = "gray";
  //   context.lineWidth = "1px";
  for (var x in particles) {
      var currentTime = elapsed - particles[x].time;
//        var currentPercent = currentTime / 1000 * particles[x].path.getTotalLength();
      particles[x].current = currentTime * particleSpeed;
      var currentPos = particles[x].path.getPointAtLength(particles[x].current);
      context.beginPath();
      context.fillStyle = particles[x].link.particleColor(particles[x].current/particles[x].path.getTotalLength());
      context.arc(currentPos.x,currentPos.y + particles[x].offset,particles[x].link.particleSize,0,2*Math.PI);
      context.fill();
  }
}


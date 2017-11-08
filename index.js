SVIFT.vis.gooey = (function (data, container) {
 
 // Module object
  var module = SVIFT.vis.base(data, container);

  module.d3config = {
    steps: data.data.data.length, 
    allCirlcesInterpolation: d3.interpolate(0,data.data.data.length),
    ease: d3.easeCubicInOut,
    easeBigCircle: d3.easeExpInOut,
    sizes: function(){
      var sizes = [];
      for (var i = 0; i < data.data.data.length; i++) {
        sizes.push(Math.sqrt(data.data.data[i][1]/Math.PI))
      }
      return sizes
    }(),
    circleColorInterpolations: function(){
      var colors = [];
      for (var i = 0; i < data.data.data.length; i++) {
        colors[i] = d3.scaleLinear().domain([0,1])
          .range([d3.rgb(data.style.color.dataColors[i]), d3.rgb(data.style.color.dataColors[i+1])]);
        //for the last bubble use the same color
        if(i == data.data.data.length-1){
          colors[i] = d3.scaleLinear().domain([0,1])
            .range([d3.rgb(data.style.color.dataColors[i]), d3.rgb(data.style.color.dataColors[i])]);
        }
      }
      return colors;
    }(),
    animation:{
      duration: 6000,
      gooeyPercent: .7
    }
  };


  module.setup = function () {

    module.d3config.gooeyContainer = module.g.append("g")
      .style("filter", "url(#gooey)") //Set the filter on the container svg

    //SVG filter for the gooey effect
    module.d3config.filter = module.d3config.gooeyContainer
      .append('filter')
      .attr('id','gooey');

    module.d3config.filter.append('feGaussianBlur')
      .attr('in','SourceGraphic')
      .attr('stdDeviation','10')
      .attr('result','blur');

    module.d3config.filter.append('feColorMatrix')
      .attr('in','blur')
      .attr('mode','matrix')
      .attr('values','1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7');

    module.d3config.circles = module.d3config.gooeyContainer.selectAll("circle")
      .data(data.data.data)
      .enter()
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .style("fill", function(d,i) {return data.style.color.dataColors[i]});


    //Add animations
    var gooeyTime = module.d3config.animation.duration * module.d3config.animation.gooeyPercent;
    var timeSteps = gooeyTime/module.d3config.steps;
    var time = 0;
    for (var i = 0; i < module.d3config.steps; i++) {
      module.timeline['animation'+i] = {start:timeSteps*i, end: timeSteps*(i+1), func:module["animate"+i]};
    }

    var lableTime = module.d3config.animation.duration - gooeyTime;
    var timeStepsLable = lableTime/module.d3config.steps;
    for (var i = 0; i < module.d3config.steps; i++) {
      var startTime = (timeStepsLable * i) + gooeyTime;
      if(i==0){startTime=gooeyTime};
      var endTime = timeStepsLable * (i+1) + gooeyTime;
      module.timeline['animationBarText'+i] = {start:startTime, end:endTime, func:module["drawBarLable"+i]};
    }


    //Add center circle
    module.d3config.centerCircle = module.d3config.gooeyContainer.append("circle")
      .attr("class", "centerCircle")
      .attr("cx",0)
      .attr("cy", 0)
      .style("fill", data.style.color.dataColors[0])

    //Add lables
    module.d3config.bubbleLables = module.g.append("g")
      .selectAll("text")
      .data(data.data.data)
      .enter()
      .append("text")
      .text(function(d,i) {return d[0] + " - " + d[1]})
      .attr("fill", data.style.color.second)
      .attr("text-anchor", "middle")
      .attr("opacity",0)
      .attr("font-family", data.style.fontLables)

  };

  module.resize = function () {

    //Sizes
    var windowWidth = module.container.node().offsetWidth - module.config.margin.left - module.config.margin.right;
    var windowHeight = module.container.node().offsetHeight - module.config.margin.top - module.config.margin.bottom;
    var maxSize = Math.min(windowWidth,windowHeight);

    //Create scale
    module.d3config.xScale = d3.scaleLinear()
      .domain([-1.7, 1.7])
      .range([-maxSize/2, maxSize/2])
      // .range([(-maxSize+ module.config.topTextHeight)/2, (maxSize- module.config.topTextHeight)/2]);


    module.d3config.gooeyContainer 
      .attr("transform", "translate(" + (windowWidth/2) + "," +(windowHeight/2) + ")");

    //Calc the future positions of the circles and make interpolation functions for each one
    var coordinates = d3.range(module.d3config.steps).map(function(num) {return (num/module.d3config.steps)*(2*Math.PI); });
    module.d3config.cyInterpolation = [];
    module.d3config.cxInterpolation = [];
    for (var i = 0; i < coordinates.length; i++) {
      var cyTarget = module.d3config.xScale(Math.sin(coordinates[i]));
      module.d3config.cyInterpolation.push(d3.interpolate(0,cyTarget));
      var cxTarget = module.d3config.xScale(Math.cos(coordinates[i]));
      module.d3config.cxInterpolation.push(d3.interpolate(0,cxTarget));
    }

    //calc the size of the cirlces
    var maxCirlceSize = maxSize/10;
    var circleInterpolator = d3.interpolate(0,maxCirlceSize);
    var maxCirleSize = Math.max.apply(Math, module.d3config.sizes);
    var circleRadiusSizes = [];
    for (var i = 0; i < module.d3config.steps; i++) {
      circleRadiusSizes.push(circleInterpolator(module.d3config.sizes[i]/maxCirleSize))
    }
    module.d3config.circles
      .attr("r", function(d,i) {return circleRadiusSizes[i]})


    //Total radius of all cirlces
    var cirleAreaTotal = 0;
    for (var i = 0; i < module.d3config.steps; i++) {
      var cirleArea = Math.PI * Math.pow(circleRadiusSizes[i],2); //back to area  Pi * radius2
      cirleAreaTotal = cirleAreaTotal + cirleArea;
    }

    var largerCirleSizes = [];
    var cirleAreaTotalFix = cirleAreaTotal;
    largerCirleSizes.push(cirleAreaTotal)

    for (var i = 0; i < module.d3config.steps; i++) {

      var cirleArea = Math.PI * Math.pow(circleRadiusSizes[i],2);
      cirleAreaTotal = cirleAreaTotal - cirleArea;
      largerCirleSizes[i+1] = cirleAreaTotal;

    }
    largerCirleSizes[largerCirleSizes.length-1]=0

    //Larger Cirle Interpolations
    largerCircleInterpolations = [];
    for (var i = 0; i < module.d3config.steps; i++) {
      largerCircleInterpolations.push(d3.interpolate(Math.sqrt(largerCirleSizes[i]/Math.PI),Math.sqrt(largerCirleSizes[i+1]/Math.PI)))
    }

    module.d3config.centerCircle = module.d3config.gooeyContainer.append("circle")
      .attr("r", cirleAreaTotalFix)

    module.d3config.bubbleLables
      .attr("dx",  function(d,i) {return module.d3config.cxInterpolation[i](1) + (windowWidth/2) })
      .attr("dy",  function(d,i) {return module.d3config.cyInterpolation[i](1) + (windowHeight/2) + circleRadiusSizes[i] + (this.getBBox().height*1.5) })
      .attr("font-size", "1em")

  };


  var circleAnimation = function(index){  
    return function(t) { 

      d3.select(module.d3config.circles._groups[0][index])
        .attr("cy",  module.d3config.cyInterpolation[index](module.d3config.ease(t)))
        .attr("cx",  module.d3config.cxInterpolation[index](module.d3config.ease(t)))

      module.d3config.centerCircle
        .attr("r", largerCircleInterpolations[index](module.d3config.easeBigCircle(t)))
        .style("fill",module.d3config.circleColorInterpolations[index](module.d3config.ease(t)))

    };
  };

  var lableAnimation = function(index){  
    return function(t) { 
      d3.select(module.d3config.bubbleLables._groups[0][index])
        .attr("opacity",1)
    };
  };

  for (var i = 0; i < module.d3config.steps; i++) {
    module["animate"+i] = circleAnimation(i)
    module["drawBarLable"+i] = lableAnimation(i)
  }

  return module;
 });
var trace = 0;

var width = 500;
var height = 500;

var xlimit_lower = -100;
var xlimit_upper = 100;

var ylimit_lower = -100;
var ylimit_upper = 100;

function get_absolute_x(rel_x) {
  return width/(xlimit_upper-xlimit_lower)*rel_x + width*0.5;
}
function get_absolute_y(rel_y) {
  return height/(ylimit_upper-ylimit_lower)*rel_y + height*0.5;
}
function get_relative_x(abs_x) {
  return (xlimit_upper-xlimit_lower)/width*(abs_x - width*0.5);
}
function get_relative_y(abs_y) {
  return (ylimit_upper-ylimit_lower)/height*(abs_y - height*0.5);
}

function getColor(valueIn, minVal,maxVal) {
    // create a linear scale
    var color = d3.scaleLinear()
      .domain([minVal, maxVal])  // input uses min and max values
      .range(["blue", "red"]);   // output for opacity between .3 and 1 %

    return color(valueIn);  // return that number to the caller
}

var canvas;
//vmodel
var nugget = 0.0;
var sill = 0.0;
var range = 0.0;

var mainlocation;
var samples = new Array();
var lines = new Array();

var point_radius = 10.0;

function makeLine(coords,is_central=false) {
    return new fabric.Line(coords, {
      fill: (is_central)?'green':'blue',
      stroke: (is_central)?'green':'blue',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
  }

function moving_callback(e) {
  var point = e.target;
  //console.log('moving',point.name);

  for (i=0; i < point.lines.length; i++) {
    line = point.lines[i];
    extreme = point.extremes[i];
    if (extreme == 1) {
      line.set('x1',point.get('left') + point_radius);
      line.set('y1',point.get('top') + point_radius);
    } else {
      line.set('x2',point.get('left') + point_radius);
      line.set('y2',point.get('top') + point_radius);
    }
    //console.log(point.lines[i].name);
  }
  canvas.renderAll();

  update_sample_location(point.index);
}

function distance(x1,y1,x2,y2) {
  return Math.sqrt((x1 - x2)*(x1 - x2) +
      (y1 - y2)*(y1 - y2));
}

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm(); // resample between 0 and 1
    return num;
}

function randn_uniform(a,b) {
    var u = Math.random(); //Converting [0,1) to (0,1)

    return u*(b-a) + a;
}

function add_point(name,x,y,is_central=false,r=point_radius) {
  var min_val = parseFloat(d3.select("#min_val").property("value"));
  var max_val = parseFloat(d3.select("#max_val").property("value"));

  var new_point = new fabric.Circle({
      radius: r, fill: 'red', left: x-r, top: y-r,objectCaching: false
      });
  new_point.set('selectable', true);
  new_point.name = name;
  new_point.is_central = is_central;
  new_point.lines = [];
  new_point.extremes = [];
  new_point.value = randn_uniform(min_val,max_val);
  new_point.set('hasRotatingPoint',false);
  new_point.set('hasControls',false);

  if (is_central) {
    new_point.set('selectable', false);
    new_point.set('fill', 'black');
  } else {
    new_point.set('fill',getColor(new_point.value, 0,10));
  }


  //var line = makeLine([10,10,300,300]);
  //line.name ='line1';

  //var text = new fabric.Text('D=0.0', { left: 200, top: 200 });
  //new_point.line = line;
  //new_point.text = text;

  //new_point.line = line;

  new_point.on('moving', moving_callback);

  return new_point;
}

function join_points(mainloc,samples) {
  var i,j;
  var pointi, pointj;
  var line;
  var lines = [];
  var points = samples.slice(0);
  points.push(mainloc);
  for (i=0; i < points.length; i++) {
    pointi = points[i]
    x1 = pointi.get('left') + point_radius;
    y1 = pointi.get('top') + point_radius;
    for (j=i+1; j < points.length; j++) {
      //connect point i and j
      pointj = points[j]
      x2 = points[j].left + point_radius;
      y2 = points[j].top + point_radius;

      if (x1 < x2) {
        x1_offset = point_radius/2.0;
        x2_offset = -point_radius/2.0;
      } else {
        x1_offset = -point_radius/2.0;
        x2_offset = +point_radius/2.0;
      }

      x1_offset = 0;
      x2_offset = 0;
      line = makeLine([x1+x1_offset,y1,x2+x2_offset,y2],pointi.is_central || pointj.is_central);
      line.name = '' + i + ':' + j;

      //console.log(i,j,x1,y1,x2,y2,pointi.is_central || pointj.is_central);

      pointi.lines.push(line);
      pointi.extremes.push(1);

      pointj.lines.push(line);
      pointj.extremes.push(2);

      lines.push(line);

      canvas.add(line);
    }
  }
  return lines;
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function round(x,d=2) {
  var p = Math.pow(10.0,d);

  return Math.round(x*p)/p;
}

function add_points() {
  var npoints = parseFloat(d3.select("#points").property("value"));
  //console.log('add_points::npoints',npoints);

  //Delete previous objects
  for (i=0;i<samples.lengths;i++) {
    canvas.remove(samples[i]);
  }
  for (i=0;i<lines.lengths;i++) {
    canvas.remove(lines[i]);
  }
  samples = [];
  canvas.clear();
  //start again
  canvas.add(mainlocation);

  angle = 360.0/npoints * (Math.PI / 180.0);

  for (i=0;i<npoints;i++) {
    var x = Math.cos(angle*(i+1)) * 50.0;
    var y = Math.sin(angle*(i+1)) * 50.0;
    var sample1 = add_point('sample' + (i+1),get_absolute_x(x),get_absolute_y(y));
    sample1.index = i;
    sample1.set('selectable', true);
    canvas.add(sample1);
    samples[i] = sample1;

  }

  lines = join_points(mainlocation,samples);

  update_samples_table();
  update_all();
  canvas.renderAll();

}

function update_and_display() {
  nugget = parseFloat(d3.select("#vm_nugget").property("value"));
  sill = parseFloat(d3.select("#vm_sill").property("value"));
  range = parseFloat(d3.select("#vm_range").property("value"));
  var ret = compute_distances(samples,mainlocation);
  var dsamples = ret[0];
  var dx = ret[1];

  var min_val = parseFloat(d3.select("#min_val").property("value"));
  var max_val = parseFloat(d3.select("#max_val").property("value"));

  var ret_fill = fill_Ab(dsamples,dx);
  var A = ret_fill[0];
  var b = ret_fill[1];
  var bcopy = b.slice(0);

  $('#distance_matrix_div').html(generate_distance_table(dsamples, dx, "distance_matrix"));
  $('#cova_matrix_div').html(generate_cova_table(A, b, "cova_matrix"));

  var x = gauss_solver(A, b);

  $('#weights_div').html(generate_weights_table(x, "weights"));

  //calculate est anf var
  var kest = 0.0;
  var kvar = nugget + sill;
  for (i=0;i<dx.length;i++) {
    //console.log('update_and_display::x',i,x[i],samples[i].get('value'));
    kest += x[i]*samples[i].get('value');
    kvar -= x[i]*bcopy[i];
  }
  kvar -= x[dx.length];

  $("#kriging_estimation").html(round(kest,4));
  $("#kriging_variance").html(round(kvar,4));

  mainlocation.value = kest;
  mainlocation.set('fill',getColor(kest, min_val,max_val));

}

function generate_distance_table(sd, ps, id) {
  var i,j;
  var n = ps.length;

  //console.log('length:',n);
  var html = `
  <table class="table" id="{0}">
    <thead>
      <tr>
        <th scope="col">#</th>`.format(id);
  for(i=0;i<n;i++) {
    html += '<th scope="col">SP' + (i+1) + '</th>';
  }
  html += `
      </tr>
    </thead>
    <tbody>`;

  for(i=0;i<n;i++) {
    html += '<tr><th scope="row">SP{0}</th>'.format((i+1));
    for(j=0;j<n;j++) {
        html += '<td id="{2}_cell{0}{1}">{3}</td>'.format(i,j,id,round(sd[i][j],2));
    }
    html += "</tr>";
  }
  html += '</tbody><tfoot><tr><th scope="row">P?</th>';
  for(j=0;j<n;j++) {
      html += '<td id="{1}_cell{0}">{2}</td>'.format(j,id,round(ps[j],2));
  }
  html += "</tr></tfoot></table>";

  return html;
}

function generate_cova_table(A, b, id) {
  var i,j;
  var n = A.length;
  var m = b.length;

  if (trace>0) {
    console.log('generate_cova_table::length A:',n);
    console.log('generate_cova_table::length b:',n);
  }
  var html = `
  <table class="table" id="{0}">
    <thead>
      <tr>
        <th scope="col">A</th>`.format(id);
  for(i=0;i<n;i++) {
    html += '<th scope="col">' + (i+1) + '</th>';
  }
  html += `
        <th scope="col"></th>
        <th scope="col">b</th>
      </tr>
    </thead>
    <tbody>`;

  for(i=0;i<n;i++) {
    html += '<tr><th scope="row">{0}</th>'.format((i+1));
    for(j=0;j<n;j++) {
      if (trace>0) console.log('A',i,j,A[i][j]);
      html += '<td id="{2}_cell{0}{1}">{3}</td>'.format(i,j,id,round(A[i][j],3));
    }
    html += '<td></td><td id="{1}_cell{0}">{2}</td>'.format(j,id,round(b[i],3));
    if (trace>0) console.log('b',i,b[i]);
    html += "</tr>";
  }
  html += "</tbody></table>";

  return html;
}

function generate_weights_table(x, id) {
  var i,j;
  var n = x.length;

  var html = `
  <table class="table" id="{0}">
    <thead>
      <tr>
        <th scope="col">&lambda;</th>
        <th scope="col"></th>
      </tr>
    </thead>
    <tbody>`;

  for(i=0;i<n-1;i++) {
    html += '<tr><th scope="row">{0}</th>'.format((i+1));
    html += '<td id="{2}_cell{0}{1}">{3}</td>'.format(i,0,id,round(x[i],3));
    html += "</tr>";
  }
  html += '<tr><th scope="row">&mu;</th>';
  html += '<td id="{2}_cell{0}{1}">{3}</td>'.format(i,0,id,round(x[n-1],3));
  html += "</tr>";


  html += "</tbody></table>";

  return html;
}

function generate_points_table(pts, id) {
  var i,j;
  var n = pts.length;

  var html = `
  <table class="table" id="{0}">
    <thead>
      <tr>
        <th scope="col">Samples</th>
        <th scope="col">x</th>
        <th scope="col">y</th>
        <th scope="col">value</th>
      </tr>
    </thead>
    <tbody>`;

  for(i=0;i<n;i++) {
    x = get_relative_x(pts[i].get('left') + point_radius);
    y = get_relative_y(pts[i].get('top') + point_radius);
    v = pts[i].get('value');

    html += '<tr><th scope="row">{0}</th>'.format((i+1));
    html += '<td id="{1}">{0}</td>'.format(round(x,2),"sample_x_"+i);
    html += '<td id="{1}">{0}</td>'.format(round(y,2),"sample_y_"+i);
    html += '<td>';
    html += '<input type="number" name="sample_value_{1}" id="sample_value_{1}" min="0" max="10" style="width: 7em" step="1" value="{0}" onchange="update_sample({1})">'.format(round(v,3),i);
    html += '</td>';
    html += "</tr>";

  }

  html += "</tbody></table>";

  return html;
}

function update_sample_location(i) {
  x = get_relative_x(samples[i].get('left') + point_radius);
  y = get_relative_y(samples[i].get('top') + point_radius);

  $('#sample_x_'+i).html(round(x,2));
  $('#sample_y_'+i).html(round(y,2));

  update_all();

}

function update_sample(i) {
  var min_val = parseFloat(d3.select("#min_val").property("value"));
  var max_val = parseFloat(d3.select("#max_val").property("value"));

  var val = parseFloat(d3.select('#sample_value_'+ i).property("value"));
  samples[i].set('fill',getColor(val, min_val,max_val));
  samples[i].value = val;
  canvas.renderAll();
  update_all()

}

function update_samples_table() {
  $('#samples_div').html(generate_points_table(samples,"samples"));
}

function update_all() {
  //update_samples_table();
  update_and_display();
}

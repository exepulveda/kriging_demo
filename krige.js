function compute_distances(points,pointx) {
    var i,j;
    var pointi, pointj;
    var nsamples = points.length;
    var A = new Array(nsamples);
    var b = new Array(nsamples);

    for (i=0; i < nsamples; i++) {
        A[i] = new Array(nsamples);
    }

    for (i=0; i < nsamples; i++) {
        pointi = points[i]
        x1 = pointi.get('left') + point_radius;
        y1 = pointi.get('top') + point_radius;

        x1 = get_relative_x(x1);
        y1 = get_relative_x(y1);


        A[i][i] = 0.0;
        for (j=i+1; j < nsamples; j++) {
           //connect point i and j
           pointj = points[j]
           x2 = pointj.left + point_radius
           y2 = pointj.top + point_radius

           x2 = get_relative_x(x2);
           y2 = get_relative_x(y2);

           A[i][j] = distance(x1,y1,x2,y2);
           A[j][i] = A[i][j];
           //console.log(i,j,A[i][j]);

        }
    }

    x2 = pointx.get('left') + point_radius
    y2 = pointx.get('top') + point_radius
    x2 = get_relative_x(x2);
    y2 = get_relative_x(y2);
    for (i=0; i < nsamples; i++) {
      pointi = points[i];
      x1 = pointi.get('left') + point_radius
      y1 = pointi.get('top') + point_radius
      x1 = get_relative_x(x1);
      y1 = get_relative_x(y1);

      b[i] = distance(x1,y1,x2,y2);

    }

    return [A,b];
}

function cova(d) {
  //Spherica model
  hr = d/range;

  if (hr <= 1) {
    ret = sill*(1.0-hr*(1.5-0.5*hr**2));
  } else {
    ret = 0.0;
  }
  return ret;
}

function fill_Ab(dsamples,dx) {
    var i,j;
    var nsamples = dx.length;
    //console.log('nsamples',nsamples);


    var A = new Array(nsamples+1);
    var b = new Array(nsamples+1);

    for (i=0; i < nsamples+1; i++) {
        A[i] = new Array(nsamples+1);
    }

    //Apply convariance
    for (i=0; i < nsamples; i++) {
        A[i][i] = nugget + sill;
        for (j=i+1; j < nsamples; j++) {
           A[i][j] = cova(dsamples[i][j]);
           A[j][i] = A[i][j];
           //console.log(i,j,A[i][j],A[j][i]);
        }
        b[i] = cova(dx[i]);
        //console.log(i,b[i]);

        A[nsamples][i] = 1.0;
        A[i][nsamples] = 1.0;
    }
    b[nsamples] = 1.0;

    A[nsamples][nsamples] = 0.0;

    return[A,b];
}

/**
 * Point
 * @param {Integer}
 * @param {Integer}
 */
var Point = function(x, y, notCalc) {
  this.x = x;
  this.y = y;

  this.render = function(color) {
    canvasContext.beginPath();

    canvasContext.arc(
      (this.x - xShift) * xSize,
      (this.y - yShift) * ySize,
      5, 0, Math.PI * 2
    );

    canvasContext.closePath();

    if (typeof(color) == 'undefined') {
      canvasContext.fillStyle = 'red';
    } else {
      canvasContext.fillStyle = color;
    }

    canvasContext.fill();
  }

  if (typeof(notCalc) == 'undefined') {
    this.z = f.eval({
      x: this.x,
      y: this.y
    });

    this.render();

    window.fEvalCounter += 1;
  }
}

/**
 * Гиперинтервал разбиения
 * @param {Point}
 * @param {Point}
 */
var Interval = function(a, b) {
  this.a = a;
  this.b = b;
  
  this.x = Math.abs(this.b.x - this.a.x);
  this.y = Math.abs(this.b.y - this.a.y);

  this.diagonal = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));

  this.R = (this.a.z + this.b.z) / 2 - fLipschitz * this.diagonal / 2;

  this.render = function() {
    canvasContext.beginPath();

    canvasContext.rect(
      (this.a.x - xShift) * xSize,
      (this.a.y - yShift) * ySize,
      this.x * xSize,
      this.y * ySize
    );

    canvasContext.closePath();

    canvasContext.fillStyle = "rgba(50, 100, 50, 0.2)";
    canvasContext.fill();

    canvasContext.lineWidth = 1;
    canvasContext.strokeStyle = 'black';
    canvasContext.stroke();
  }

  /**
   * Вычислить точку на диагонали текущего гиперинтервала для следующего разбиения
   * @return {Point}
   */
  this.getS = function() {
    var temp = (this.b.z - this.a.z) / (2 * fLipschitz);
    var x = ((this.a.x + this.b.x) / 2) - temp;
    var y = ((this.a.y + this.b.y) / 2) - temp;
    return new Point(x, y, true);
  }
}

/**
 * Коллекция гиперинтервалов
 * @param {Interval} Начальный гиперинтервал
 */
var IntervalCollection = function(interval) {
  this.c = [interval];
  this.base = interval;

  this.clear = function() {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  }

  this.render = function() {
    this.clear();
    for (var i = 0; i < this.c.length; i++) {
      this.c[i].render();
    }
  }

  /**
   * Найти номер гиперинтервала с минимальной характеристикой
   * @return {Integer} Номер гиперинтервала
   */
  this.getMinRArg = function() {
    var min = this.c[0].R;
    var t = 0;
    for (var i = 1; i < this.c.length; i++) {
      if (this.c[i].R < min) {
        min = this.c[i].R;
        t = i;
      }
    }
    return t;
  }
}

/**
 * Запустить алгоритм поиска минимума
 * @return {undefined}
 */
var run = function() {  
  window.D = new IntervalCollection(new Interval(
    new Point(lowBound, lowBound),
    new Point(highBound, highBound)
  ));

  D.clear();

  var a, b, active, S;
  do {
    active = D.getMinRArg();

    // точка разбиения
    S = D.c[active].getS();

    // разбиение по длинной стороне
    a = D.c[active].a;
    b = D.c[active].b;

    if (D.c[active].x > D.c[active].y) {
      D.c[active] = new Interval(
        a,
        new Point(S.x, b.y)
      );

      D.c.push(new Interval(
        new Point(S.x, a.y),
        b
      ));

    } else {
      D.c[active] = new Interval(
        new Point(a.x, S.y),
        b
      );

      D.c.push(new Interval(
        a,
        new Point(b.x, S.y)
      ));
    }

    // рендерим только то, что изменилось
    D.c[D.c.length - 2].render();
    D.c[D.c.length - 1].render();

    // критерий останова по объёму и по количеству итераций
  } while (D.c[active].diagonal > (eps * D.base.diagonal) && D.c.length < 10000);

  // ищем минимум по всем вычисленным нами значениям функции
  window.globalMin = D.c[0].a
  for (var i = 0; i < D.c.length; i++) {
    if (D.c[i].a.z < globalMin.z) {
      globalMin = D.c[i].a;
    }
    if (D.c[i].b.z < globalMin.z) {
      globalMin = D.c[i].b;
    }
  }

  globalMin.render('blue');
}

$(function() {
  window.canvas = document.getElementById("visualization");
  window.canvasContext = canvas.getContext("2d");

  $('#run').on('click', function(e) {
    e.preventDefault();

    var params = $(e.target).closest('form').serializeArray();
    $(params).each(function() {
      params[this.name] = this.value;
    });

    // параметры алгоритмы
    window.f = math.compile(params['f']);
    window.fLipschitz = parseFloat(params['fLipschitz']);
    window.lowBound = parseFloat(params['lowBound']);
    window.highBound = parseFloat(params['highBound']);
    window.eps = parseFloat(params['eps']);

    // счётчик вычислений функции
    window.fEvalCounter = 0;

    // растяжение осей
    window.xSize = canvas.width / Math.abs(highBound - lowBound);
    window.ySize = canvas.height / Math.abs(highBound - lowBound);

    // сдвиг координат
    window.xShift = lowBound;
    window.yShift = lowBound;

    run();

    $('#d-length').text(D.c.length);
    $('#active-x').text(globalMin.x);
    $('#active-y').text(globalMin.y);
    $('#active-f').text(globalMin.z);
    $('#f-eval-counter').text(fEvalCounter);
  });
});
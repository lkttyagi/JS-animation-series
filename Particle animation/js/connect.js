setTimeout(function(){
'use strict'
 let map = (val, a1, a2, b1, b2) => b1 + (val - a1) * (b2 - b1) / (a2 - a1)

class Connect {
  constructor() {

    // config ---
    this.text = ''
    this.font = 'Source Sans Pro' // loaded via Google Font API (kind of buggy, better reference it as well)

    this.spacing = 24// multiplier for upscaling the text
    this.sharpness = 24// scalles down when to big for screen
    this.sharpnessMinimum = 14
    this.innerMaxLength = 30 
    this.outerMaxLength = 80 
    this.mouseClear = 0

    // --- end config

    this.bounds = {
      top: 1,
      left: 1,
      right: 0,
      bottom: 0
    }

    this.mouse = {
      on: false,
      x: 0,
      y: 0
    }

    this.dots = []
    this.oldKey = 0
    this.resize()

    // add some random particles
    let colorCounter = 0
    let randomCount = this.width * this.height / 5000 | 0
    for (let i = 0; i < randomCount; i++) {
      this.dots.push(
        new Dot(
          Math.random() * this.width | 0,
          Math.random() * this.height | 0,
          (this.colorCounter += 2) < 500 ? this.colorCounter : this.colorCounter = 0,
          false
        )
      )
    }

    // add text particles
    this.addText()

  }

  resize() {
    this.width = canvas.width = window.innerWidth
    this.height = canvas.height = window.innerHeight

    this.bounds.right = this.width - 1
    this.bounds.bottom = this.height - 1
  }

  onMove(evt) {
    this.mouse.on = true

    this.mouse.x = evt.clientX || evt.touches && evt.touches[0].pageX
    this.mouse.y = evt.clientY || evt.touches && evt.touches[0].pageY
  }

  onLeave(evt) {
    this.mouse.on = false
  }

  update() {
    ctx.clearRect(0, 0, this.width, this.height)

    this.newKey = this.oldKey + 1
    if (this.newKey > 100000) this.newKey = 0

    for (let i = 0, dot1; dot1 = this.dots[i]; i++) {
      let mouseNear = this.mouse.on &&
        Math.abs(dot1.x - this.mouse.x) < this.mouseClear &&
        Math.abs(dot1.y - this.mouse.y) < this.mouseClear

      for (let j = i + 1, dot2; dot2 = this.dots[j]; j++) {

        // is this particle inside the text, than update its framekey (unless already done)
        if (dot1.in != this.newKey &&
          Math.abs(dot1.x - dot2.origX) <= this.spacing &&
          Math.abs(dot1.y - dot2.origY) <= this.spacing) dot1.in = this.newKey

        // should these dots be connected..?
        let xDiff = Math.abs(dot1.x - dot2.x) 
        let yDiff = Math.abs(dot1.y - dot2.y)

        if (!mouseNear &&
           ((!dot1.protect && !dot2.protect && xDiff < this.outerMaxLength && yDiff < this.outerMaxLength) || 
           (xDiff < this.innerMaxLength && yDiff < this.innerMaxLength))) {

          let gradient = ctx.createLinearGradient(dot1.x, dot1.y, dot2.x, dot1.y)
          gradient.addColorStop(0, 'hsla(' + dot1.color + ',0%,100%,' + map((xDiff+yDiff)/.5,0,70,1,0.3) + ')')
          gradient.addColorStop(1, 'hsla(' + dot2.color + ',0%,100%,' + map((xDiff+yDiff)/2,0,70,1,0.1) + ')')

          ctx.beginPath()
          ctx.moveTo(dot1.x, dot1.y)
          ctx.lineTo(dot2.x, dot2.y)
          ctx.strokeStyle = gradient
          ctx.lineWidth = dot1.radius / 2
          ctx.stroke()

        }

      }
    }

    this.oldKey = this.newKey

    // call all the dots update method
    for (let dot of this.dots) dot.update(this.oldKey, this.bounds)

  }

  // this makes sure that the font is loaded
  // taken from http://stackoverflow.com/a/8223555/3137109
  // this is not really perfect and still buggy.
  addText() {
    
    let link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://fonts.googleapis.com/css?family=' + this.font.split(' ').join('+')
    document.getElementsByTagName('head')[0].appendChild(link)

    let _self = this
    let image = new Image
    image.onerror = () => _self.buildText()
    image.src = link.href

  }

  // Creates a new canvas, writes text in in and provids a filling for all these dots
  buildText() {
    if (this.text.length === 0) return
      // space the letters out, so the arn't to close
    let spacyText = this.text.split('').join(' ')

      // create another canvas
    let textCanvas = document.createElement('canvas');
    textCanvas.width = this.sharpness * spacyText.length
    textCanvas.height = this.sharpness + this.sharpness / 4

    let textCtx = textCanvas.getContext('2d')
      // red since later we only take the first set of pixel anyway, but other colors  wouldn't hurt either
    textCtx.fillStyle = '#f00'
    textCtx.font = 'bold ' + this.sharpness + 'px ' + this.font
    textCtx.fillText(spacyText, 0, this.sharpness)

    let width = textCtx.measureText(spacyText).width | 0
      // scale down when to big
      // * this.spacing because we scale it up later
    if (width * this.spacing > this.width && this.sharpness > this.sharpnessMinimum) {
      --this.sharpness
      return this.buildText()
    }

    // fill the dots into the real dots array
    let colorCounter = 0
    let leftOffset = Math.max(0, (this.width - width * this.spacing) / 2 | 0)
    let topOffset = Math.max(0, (this.height - (this.sharpness + this.sharpness / 4) * this.spacing) / 2 | 0)

    // get the all canvas pixel values(jump 4 as there are always 4 values(red,green,blue,alpha))
    // take the red and create a dot (true = there was a colored pixel)
    let data = []
    let canvasData = textCtx.getImageData(0, 0, width, this.sharpness + this.sharpness / 4).data
    for (let i = 0; i < canvasData.length; i += 4) {
      // there is a colored pixel
      if (canvasData[i]) {
        let ii = i >> 2
        // push a new dot, also scale it up and set a color
        this.dots.push(
          new Dot(ii % width * this.spacing + leftOffset,
            (ii / width | 0) * this.spacing + topOffset,
            ii % width * this.spacing * 0.3,
            true
          )
        )
      }

    } // end for loop

  }

}

class Dot {
  constructor(x, y, color, protect) {
    this.origX = x
    this.origY = y
    this.x = x
    this.y = y

    this.vx = (Math.random() - 0.5) * 2
    this.vy = (Math.random() - 0.5) * 2

    this.radius = (Math.random() + 0.8) * 1.5
    this.internalColor = 'hsla(' + color + ',0%,100%,' + this.radius * 0.4 + ')'
    this.color = color

    this.protect = protect

    this.swipSwap = false
    this.inSwip = true
  }

  update(oldKey, bounds) {

    ctx.beginPath()
    ctx.fillStyle = this.internalColor
    ctx.arc(this.x, this.y, this.radius, 0, 6, false)
    ctx.fill()

    if (this.y < bounds.top || this.y > bounds.bottom) return this.y += this.vy = -this.vy
    if (this.x < bounds.left || this.x > bounds.right) return this.x += this.vx = -this.vx

    this.swipSwap = !this.swipSwap

    if (this.protect && this.in >= oldKey) { // it is still indside the text
      this.inSwip = true

      if (Math.abs(this.x - this.origX) > 10 ||
        Math.abs(this.y - this.origY) > 10) {
        if (!this.swipSwap) this.vx = -this.vx
        else this.vy = -this.vy
      }

      if (this.swipSwap) this.x += this.vx * 0.4
      else this.y += this.vy * 0.4

    } else {
      // if it was inside a text but left now
      if (this.inSwip && this.protect && Math.random() < 0.995) {
        if (!this.swipSwap) this.x += this.vx = -this.vx
        else this.y += this.vy = -this.vy
      } else this.protected = false

      this.inSwip = false

      if (this.swipSwap) this.x += this.vx
      else this.y += this.vy
    }

  }

}

let canvas = document.getElementById('connect')
let ctx = canvas.getContext('2d')

let connect = new Connect

canvas.onmousemove = (evt) => connect.onMove(evt)
canvas.onmouseleave = (evt) => connect.onLeave(evt)
canvas.ontouchstart = (evt) => connect.onMove(evt)
canvas.ontouchmove = (evt) => connect.onMove(evt)

window.onresize = () => connect.resize()

;(function update() {
  requestAnimationFrame(update)
  connect.update()

}())
},2100);

var myfunc = function()
{
  let map = (val, a1, a2, b1, b2) => b1 + (val - a1) * (b2 - b1) / (a2 - a1)

class Connect {
  constructor() {

    // config ---
    this.text = 'O'
    this.font = 'Source Sans Pro' // loaded via Google Font API (kind of buggy, better reference it as well)

    this.spacing = 23// multiplier for upscaling the text
    this.sharpness = 23// scalles down when to big for screen
    this.sharpnessMinimum = 14
    this.innerMaxLength = 30 
    this.outerMaxLength = 80 
    this.mouseClear = 0

    // --- end config

    this.bounds = {
      top: 1,
      left: 1,
      right: 0,
      bottom: 0
    }

    this.mouse = {
      on: false,
      x: 0,
      y: 0
    }

    this.dots = []
    this.oldKey = 0
    this.resize()

    // add some random particles
    let colorCounter = 0
    let randomCount = this.width * this.height / 8000 | 0
    for (let i = 0; i < randomCount; i++) {
      this.dots.push(
        new Dot(
          Math.random() * this.width | 0,
          Math.random() * this.height | 0,
          (this.colorCounter += 2) < 360 ? this.colorCounter : this.colorCounter = 0,
          false
        )
      )
    }

    // add text particles
    this.addText()

  }

  resize() {
    this.width = canvas.width = window.innerWidth
    this.height = canvas.height = window.innerHeight

    this.bounds.right = this.width - 1
    this.bounds.bottom = this.height - 1
  }

  onMove(evt) {
    this.mouse.on = true

    this.mouse.x = evt.clientX || evt.touches && evt.touches[0].pageX
    this.mouse.y = evt.clientY || evt.touches && evt.touches[0].pageY
  }

  onLeave(evt) {
    this.mouse.on = false
  }

  update() {
    ctx.clearRect(0, 0, this.width, this.height)

    this.newKey = this.oldKey + 1
    if (this.newKey > 100000) this.newKey = 0

    for (let i = 0, dot1; dot1 = this.dots[i]; i++) {
      let mouseNear = this.mouse.on &&
        Math.abs(dot1.x - this.mouse.x) < this.mouseClear &&
        Math.abs(dot1.y - this.mouse.y) < this.mouseClear

      for (let j = i + 1, dot2; dot2 = this.dots[j]; j++) {

        // is this particle inside the text, than update its framekey (unless already done)
        if (dot1.in != this.newKey &&
          Math.abs(dot1.x - dot2.origX) <= this.spacing &&
          Math.abs(dot1.y - dot2.origY) <= this.spacing) dot1.in = this.newKey

        // should these dots be connected..?
        let xDiff = Math.abs(dot1.x - dot2.x) 
        let yDiff = Math.abs(dot1.y - dot2.y)

        if (!mouseNear &&
           ((!dot1.protect && !dot2.protect && xDiff < this.outerMaxLength && yDiff < this.outerMaxLength) || 
           (xDiff < this.innerMaxLength && yDiff < this.innerMaxLength))) {

          let gradient = ctx.createLinearGradient(dot1.x, dot1.y, dot2.x, dot1.y)
          gradient.addColorStop(0, 'hsla(' + dot1.color + ',0%,100%,' + map((xDiff+yDiff)/.5,0,70,1,0.3) + ')')
          gradient.addColorStop(1, 'hsla(' + dot2.color + ',0%,100%,' + map((xDiff+yDiff)/2,0,70,1,0.1) + ')')

          ctx.beginPath()
          ctx.moveTo(dot1.x, dot1.y)
          ctx.lineTo(dot2.x, dot2.y)
          ctx.strokeStyle = gradient
          ctx.lineWidth = dot1.radius / 1.5
          ctx.stroke()

        }

      }
    }

    this.oldKey = this.newKey

    // call all the dots update method
    for (let dot of this.dots) dot.update(this.oldKey, this.bounds)

  }

  // this makes sure that the font is loaded
  // taken from http://stackoverflow.com/a/8223555/3137109
  // this is not really perfect and still buggy.
  addText() {
    
    let link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://fonts.googleapis.com/css?family=' + this.font.split(' ').join('+')
    document.getElementsByTagName('head')[0].appendChild(link)

    let _self = this
    let image = new Image
    image.onerror = () => _self.buildText()
    image.src = link.href

  }

  // Creates a new canvas, writes text in in and provids a filling for all these dots
  buildText() {
    if (this.text.length === 0) return
      // space the letters out, so the arn't to close
    let spacyText = this.text.split('').join(' ')

      // create another canvas
    let textCanvas = document.createElement('canvas');
    textCanvas.width = this.sharpness * spacyText.length
    textCanvas.height = this.sharpness + this.sharpness / 4

    let textCtx = textCanvas.getContext('2d')
      // red since later we only take the first set of pixel anyway, but other colors  wouldn't hurt either
    textCtx.fillStyle = '#f00'
    textCtx.font = 'bold ' + this.sharpness + 'px ' + this.font
    textCtx.fillText(spacyText, 0, this.sharpness)

    let width = textCtx.measureText(spacyText).width | 0
      // scale down when to big
      // * this.spacing because we scale it up later
    if (width * this.spacing > this.width && this.sharpness > this.sharpnessMinimum) {
      --this.sharpness
      return this.buildText()
    }

    // fill the dots into the real dots array
    let colorCounter = 0
    let leftOffset = Math.max(0, (this.width - width * this.spacing) / 2 | 0)
    let topOffset = Math.max(0, (this.height - (this.sharpness + this.sharpness / 4) * this.spacing) / 2 | 0)

    // get the all canvas pixel values(jump 4 as there are always 4 values(red,green,blue,alpha))
    // take the red and create a dot (true = there was a colored pixel)
    let data = []
    let canvasData = textCtx.getImageData(0, 0, width, this.sharpness + this.sharpness / 4).data
    for (let i = 0; i < canvasData.length; i += 4) {
      // there is a colored pixel
      if (canvasData[i]) {
        let ii = i >> 2
        // push a new dot, also scale it up and set a color
        this.dots.push(
          new Dot(ii % width * this.spacing + leftOffset,
            (ii / width | 0) * this.spacing + topOffset,
            ii % width * this.spacing * 0.3,
            true
          )
        )
      }

    } // end for loop

  }

}

class Dot {
  constructor(x, y, color, protect) {
    this.origX = x
    this.origY = y
    this.x = x
    this.y = y

    this.vx = (Math.random() - 0.5) * 1.5
    this.vy = (Math.random() - 0.5) * 1.5

    this.radius = (Math.random() + 0.8) * 1.5
    this.internalColor = 'hsla(' + color + ',0%,100%,' + this.radius * 0.4 + ')'
    this.color = color

    this.protect = protect

    this.swipSwap = false
    this.inSwip = true
  }

  update(oldKey, bounds) {

    ctx.beginPath()
    ctx.fillStyle = this.internalColor
    ctx.arc(this.x, this.y, this.radius, 0, 6, false)
    ctx.fill()

    if (this.y < bounds.top || this.y > bounds.bottom) return this.y += this.vy = -this.vy
    if (this.x < bounds.left || this.x > bounds.right) return this.x += this.vx = -this.vx

    this.swipSwap = !this.swipSwap

    if (this.protect && this.in >= oldKey) { // it is still indside the text
      this.inSwip = true

      if (Math.abs(this.x - this.origX) > 10 ||
        Math.abs(this.y - this.origY) > 10) {
        if (!this.swipSwap) this.vx = -this.vx
        else this.vy = -this.vy
      }

      if (this.swipSwap) this.x += this.vx * 0.4
      else this.y += this.vy * 0.4

    } else {
      // if it was inside a text but left now
      if (this.inSwip && this.protect && Math.random() < 0.995) {
        if (!this.swipSwap) this.x += this.vx = -this.vx
        else this.y += this.vy = -this.vy
      } else this.protected = false

      this.inSwip = false

      if (this.swipSwap) this.x += this.vx
      else this.y += this.vy
    }

  }

}

let canvas = document.getElementById('connect')
let ctx = canvas.getContext('2d')

let connect = new Connect

canvas.onmousemove = (evt) => connect.onMove(evt)
canvas.onmouseleave = (evt) => connect.onLeave(evt)
canvas.ontouchstart = (evt) => connect.onMove(evt)
canvas.ontouchmove = (evt) => connect.onMove(evt)

window.onresize = () => connect.resize()

;(function update() {
  requestAnimationFrame(update)
  connect.update()

}())
}
window.onload =function()
{
  setTimeout(myfunc,5000);
}


'use strict';

class Utils {
  constructor() {
    this.windowW = $(window).width();
    this.windowH = $(window).height();
  }
}

var utils = new Utils();
class App {
  constructor() {
    this.ball = document.getElementById("ball");
    this.body = document.querySelector("body");
  }
  init() {
    this.ballTaking = false;

    this.ball.addEventListener("mousedown", this.takeBall.bind(this));
    this.ball.addEventListener("mouseup", this.releaseBall.bind(this));
    this.body.addEventListener("mousemove", this.dragBall.bind(this));
    console.log(this.ball);
  }
  takeBall(e) {
    this.ballTaking = true;
  }
  dragBall(e) {
    let width = (100 - (Math.abs(parseInt((e.pageX - utils.windowW / 2) * 100 / utils.windowW)))) / 100;
    let height = (100 - (Math.abs(parseInt((e.pageY - utils.windowH / 2) * 100 / utils.windowH)))) / 100;

    let x = Math.round(e.pageX - utils.windowW / 2);
    let y = Math.round(e.pageY - utils.windowH / 2);

    let t = x / y;

    let r = -Math.round(Math.atan(t) * 180 / Math.PI);

    if (this.ballTaking) {
      TweenLite.to(this.ball, 0, {
        left: e.pageX,
        top: e.pageY,
        scaleX: (width + height) / 2,
        rotation: r
      });
    }
  }
  releaseBall(e) {
    this.ballTaking = false;

    TweenLite.to(this.ball, 2, {
      left: "50%",
      top: "50%",
      scaleX: 1,
      ease: Elastic.easeOut
    });

  }

}

var app = new App();

app.init();


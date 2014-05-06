// Electropaint/JS
// Copyright 2013 (C) Ralph Thomas <ralpht@gmail.com>, Palo Alto, CA
/*
 Derived from:
 * Modifications for Universal Binary (Version 0.3)
 * 07/10/06 Alexander v. Below <alex@vonbelow.com>
 * Modifications for antialiasing, VBL, parameter tweak.
 * Vincent Fiano <ynniv-ep@ynniv.com>
 * http://www.lloydslounge.org/electropaintosx/
 * Created by Douglas McInnes on 12/17/04.
 * Copyright (c) 2004, Kent RosenKoetter, Douglas McInnes. 
 * All rights reserved.
 * ported from Kent Rosenkoetter's electropaint.cpp:
 * http://legolas.homelinux.org/~kent/electropaint/
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
*/

(function() {
/* Not very idiomatic JS; looks like the c++ */
function Color() {
    if (arguments.length == 0) {
        this.red = 1; this.blue = 1; this.green = 1;
    } else if (arguments.length == 1) {
        var other = arguments[0];
        this.red = other.red; this.blue = other.blue; this.green = other.green;
    } else if (arguments.length == 3) {
        this.red = arguments[0];
        this.green = arguments[1];
        this.blue = arguments[2];
    }
}
Color.prototype.toString = function() {
    return 'rgba(' + Math.round(this.red * 255) + ',' + Math.round(this.green * 255) + ',' + Math.round(this.blue * 255) + ',1.0)';
}

function Wing(spec) {
    function get(name, def) { return (spec && spec.hasOwnProperty(name)) ? spec[name] : def; }
    this.radius = get('radius', 10);
    this.angle = get('angle', 0);
    this.delta_angle = get('delta_angle', 15);
    this.z_delta = get('z_delta', 0.5);
    this.roll = get('roll', 0);
    this.pitch = get('pitch', 0);
    this.yaw = get('yaw', 0);
    this.color = get('color', new Color());
    this.edge_color = get('edge_color', new Color());
    this.alpha = get('alpha', 1);
    this.element = document.createElement('div');
    this.element.className = 'wing';
    this.element.style.backgroundColor = this.color.toString();
}

function RandomGenerator(spec) {
    function impl(spec) {
        function get(name, def) { return (spec && spec.hasOwnProperty(name)) ? spec[name] : def; }
        this.min_value = get('min', 0);
        this.max_value = get('max', 1);
        this.stability = get('stability', 50);
        this.wrap = get('wrap', false);
        this.max_acceleration = get('max_acceleration', 0.005);
        this.max_speed = get('max_speed', 0.02);
    
        this._value = 0;
        this._delta = 0;
        this._count = 1000;
        this._randState = 0;
        this._accel = 0;
    }
    impl.prototype.generate = function() {
        this._count++;
        if (this._count > this.stability) {
            this._accel = this._getNewAccel();
            this._count = 0;
        }
        this._delta += this._accel;
        this._delta = Math.min(this._delta, this.max_speed);
        this._delta = Math.max(this._delta, -this.max_speed);
        this._value += this._delta;
        if (this.wrap) {
            this._value = ((this._value - this.min_value) % (this.max_value - this.min_value)) + this.min_value;
        } else {
            this._value = Math.min(this._value, this.max_value);
            this._value = Math.max(this._value, this.min_value);
        }
        return this._value;
    }
    impl.prototype._getNewAccel = function() {
        var f = (Math.random() - 0.5) * 2.0;
        f = f * this.max_acceleration;
        return f;
    }
    var instance = new impl(spec);
    return instance.generate.bind(instance);
}

var red_movement = RandomGenerator({min: 0, max: 1, stability: 95});
var green_movement = RandomGenerator({min: 0, max: 1, stability: 40});
var blue_movement = RandomGenerator({min: 0, max: 1, stability: 70});
var roll_change = RandomGenerator({min: 0, max: 360, stability: 80, wrap: true, max_speed: 0.5, max_acceleration: 0.125});
var pitch_change = RandomGenerator({min: 0, max: 360, stability: 40, wrap: true, max_speed: 1, max_acceleration: 0.125});
var yaw_change = RandomGenerator({min: 0, max: 360, stability: 50, wrap: true, max_speed: 0.75, max_acceleration: 0.125});
var radius_change = RandomGenerator({min: -15, max: 15, stability: 150, wrap: false, max_speed: 0.05, max_acceleration: 0.005});
var angle_change = RandomGenerator({min: 0, max: 360, stability: 120, wrap: true, max_speed: 1, max_acceleration: 0.025});
var delta_angle_change = RandomGenerator({min: 0, max: 360, stability: 80, wrap: true, max_speed: 0.1, max_acceleration: 0.01});
var z_delta_change = RandomGenerator({min: 0.4, max: 0.7, stability: 200, wrap: false, max_speed: 0.005, max_acceleration: 0.0005});

function newWing() {
    return new Wing({
            radius: radius_change(),
            angle: angle_change(),
            delta_angle: delta_angle_change(),
            z_delta: z_delta_change(),
            roll: roll_change(),
            pitch: pitch_change(),
            yaw: yaw_change(),
            color: new Color(red_movement(), green_movement(), blue_movement())});
}


var wings = [];
var camera = document.createElement('div');
camera.className = 'camera';
document.body.appendChild(camera);

for (var i = 0; i < 40; i++) {
    var wing = newWing();
    camera.appendChild(wing.element);
    wings.push(wing);
}

function frame() {
    var old = wings.pop();
    var next = newWing();
    camera.removeChild(old.element);
    camera.appendChild(next.element);
    wings.unshift(next);
}

function render() {
    frame();
    var m = id();
    for (var i = 0; i < wings.length; i++) {
        var wing = wings[i];

        var lm = m = translate(m, 0, 0, wing.z_delta * window.innerHeight * 0.02);
        
        lm = rotate(lm, 0, 0, wing.angle + i * wing.delta_angle)
        lm = translate(lm, wing.radius * 10, 0, 0)
        lm = rotate(lm, 0, 0, -wing.yaw)
        lm = rotate(lm, 0, -wing.pitch, 0)
        lm = rotate(lm, wing.roll, 0, 0);

        transform(wing.element, lm)
    }
    requestAnimationFrame(render);
}

render();

function transform(el, m) {
    el.style.MozTransform =
    el.style.webkitTransform = "matrix3d(" + m.join(", ") + ")";
}

function id() {
    return [ 1, 0, 0, 0,
             0, 1, 0, 0,
             0, 0, 1, 0,
             0, 0, 0, 1 ];
}

function translate(m, x, y, z) {
    return mult(m, id().slice(0, 12).concat([x, y, z, 1]))
}

function rotate(m, x, y, z) {
    x *= Math.PI / 180;
    y *= Math.PI / 180;
    z *= Math.PI / 180;

    var cosx =  Math.cos(x)
      , sinx = -Math.sin(x);

    var cosy =  Math.cos(y)
      , siny = -Math.sin(y);

    var cosz =  Math.cos(z)
      , sinz = -Math.sin(z);

    var rm = id()

    rm[ 0] =  cosy * cosz;
    rm[ 1] = -cosy * sinz;
    rm[ 2] =  siny;

    rm[ 4] =  sinx * siny * cosz + cosx * sinz;
    rm[ 5] =  cosx * cosz - sinx * siny * sinz;
    rm[ 6] = -sinx * cosy;

    rm[ 8] = sinx * sinz - cosx * siny * cosz;
    rm[ 9] = sinx * cosz + cosx * siny * sinz;
    rm[10] = cosx * cosy;

    return mult(m, rm);
}

function mult(m1, m2) {
    return [ m2[ 0] * m1[ 0] + m2[ 1] * m1[ 4] + m2[ 2] * m1[ 8] + m2[ 3] * m1[12],
             m2[ 0] * m1[ 1] + m2[ 1] * m1[ 5] + m2[ 2] * m1[ 9] + m2[ 3] * m1[13],
             m2[ 0] * m1[ 2] + m2[ 1] * m1[ 6] + m2[ 2] * m1[10] + m2[ 3] * m1[14],
             m2[ 0] * m1[ 3] + m2[ 1] * m1[ 7] + m2[ 2] * m1[11] + m2[ 3] * m1[15],
             
             m2[ 4] * m1[ 0] + m2[ 5] * m1[ 4] + m2[ 6] * m1[ 8] + m2[ 7] * m1[12],
             m2[ 4] * m1[ 1] + m2[ 5] * m1[ 5] + m2[ 6] * m1[ 9] + m2[ 7] * m1[13],
             m2[ 4] * m1[ 2] + m2[ 5] * m1[ 6] + m2[ 6] * m1[10] + m2[ 7] * m1[14],
             m2[ 4] * m1[ 3] + m2[ 5] * m1[ 7] + m2[ 6] * m1[11] + m2[ 7] * m1[15],
             
             m2[ 8] * m1[ 0] + m2[ 9] * m1[ 4] + m2[10] * m1[ 8] + m2[11] * m1[12],
             m2[ 8] * m1[ 1] + m2[ 9] * m1[ 5] + m2[10] * m1[ 9] + m2[11] * m1[13],
             m2[ 8] * m1[ 2] + m2[ 9] * m1[ 6] + m2[10] * m1[10] + m2[11] * m1[14],
             m2[ 8] * m1[ 3] + m2[ 9] * m1[ 7] + m2[10] * m1[11] + m2[11] * m1[15],

             m2[12] * m1[ 0] + m2[13] * m1[ 4] + m2[14] * m1[ 8] + m2[15] * m1[12],
             m2[12] * m1[ 1] + m2[13] * m1[ 5] + m2[14] * m1[ 9] + m2[15] * m1[13],
             m2[12] * m1[ 2] + m2[13] * m1[ 6] + m2[14] * m1[10] + m2[15] * m1[14],
             m2[12] * m1[ 3] + m2[13] * m1[ 7] + m2[14] * m1[11] + m2[15] * m1[15] ]
}

})()
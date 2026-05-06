"use strict";

var Dice3D = Dice3D || {};

Dice3D.Bridge = {
    vibrate: function(d) { if(window.DiceBridge) DiceBridge.vibrate(d); },
    vibrateWithIntensity: function(d, i) { if(window.DiceBridge) DiceBridge.vibrateWithIntensity(d, i); },
    isDarkMode: function() { return window.DiceBridge ? DiceBridge.isDarkMode() : window.matchMedia('(prefers-color-scheme: dark)').matches; },
    getThemeMode: function() { return window.DiceBridge ? DiceBridge.getThemeMode() : localStorage.getItem('themeMode') || 'system'; },
    setThemeMode: function(m) { localStorage.setItem('themeMode', m); if(window.DiceBridge) DiceBridge.setThemeMode(m); },
    saveToStorage: function(k, v) { localStorage.setItem(k, v); if(window.DiceBridge) DiceBridge.saveToStorage(k, v); },
    loadFromStorage: function(k) { if(window.DiceBridge) return DiceBridge.loadFromStorage(k); return localStorage.getItem(k); },
    hasGyroscope: function() { return window.DiceBridge ? DiceBridge.hasGyroscope() : false; },
    requestSensorPermission: function() { if(window.DiceBridge) DiceBridge.requestSensorPermission(); }
};

Dice3D.Theme = {
    apply: function(mode) {
        var isDark;
        if(mode === 'dark') isDark = true;
        else if(mode === 'light') isDark = false;
        else isDark = Dice3D.Bridge.isDarkMode();
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if(Dice3D.Scene3D) Dice3D.Scene3D.setDarkMode(isDark);
    },
    init: function() {
        var mode = Dice3D.Bridge.getThemeMode();
        Dice3D.Theme.apply(mode);
        window.onThemeChanged = function(isDark) {
            var mode = Dice3D.Bridge.getThemeMode();
            if(mode === 'system') Dice3D.Theme.apply('system');
        };
        var radios = document.querySelectorAll('input[name="theme-mode"]');
        radios.forEach(function(r) {
            r.addEventListener('change', function() {
                Dice3D.Bridge.setThemeMode(this.value);
                Dice3D.Theme.apply(this.value);
            });
        });
    }
};

Dice3D.Audio = {
    ctx: null,
    enabled: true,
    init: function() { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playThrow: function() { if(!this.enabled || !this.ctx) return; var o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination); o.frequency.setValueAtTime(200,this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(80,this.ctx.currentTime+0.3); g.gain.setValueAtTime(0.3,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,this.ctx.currentTime+0.3); o.start(); o.stop(this.ctx.currentTime+0.3); },
    playBounce: function() { if(!this.enabled || !this.ctx) return; var o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination); o.frequency.setValueAtTime(800,this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(400,this.ctx.currentTime+0.1); g.gain.setValueAtTime(0.2,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,this.ctx.currentTime+0.1); o.start(); o.stop(this.ctx.currentTime+0.1); },
    playLand: function() { if(!this.enabled || !this.ctx) return; var o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.connect(g); g.connect(this.ctx.destination); o.frequency.setValueAtTime(600,this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(200,this.ctx.currentTime+0.2); g.gain.setValueAtTime(0.4,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,this.ctx.currentTime+0.2); o.start(); o.stop(this.ctx.currentTime+0.2); }
};

Dice3D.Scene3D = {
    scene: null, camera: null, renderer: null, ground: null,
    init: function(container) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xF5F5F7);
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth/container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 12, 12);
        this.camera.lookAt(0,0,0);
        this.renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        var light = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(light);
        var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        var groundGeo = new THREE.PlaneGeometry(30, 30);
        var groundMat = new THREE.MeshStandardMaterial({color:0xE8E8ED});
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI/2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        window.addEventListener('resize', this.onResize.bind(this));
    },
    setDarkMode: function(isDark) {
        this.scene.background = new THREE.Color(isDark ? 0x1C1C1E : 0xF5F5F7);
        this.ground.material.color.setHex(isDark ? 0x2C2C2E : 0xE8E8ED);
    },
    onResize: function() {
        var container = this.renderer.domElement.parentElement;
        this.camera.aspect = container.clientWidth/container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    },
    render: function() { this.renderer.render(this.scene, this.camera); }
};

Dice3D.Physics = {
    world: null,
    init: function() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        var groundShape = new CANNON.Plane();
        var groundBody = new CANNON.Body({mass:0, shape:groundShape});
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
        this.world.addBody(groundBody);
        var wallMaterial = new CANNON.Material();
        var wallShape = new CANNON.Plane();
        var walls = [{pos:[0,0,-15], rot:[0,0,0]},{pos:[0,0,15], rot:[0,Math.PI,0]},{pos:[-15,0,0], rot:[0,Math.PI/2,0]},{pos:[15,0,0], rot:[0,-Math.PI/2,0]}];
        walls.forEach(function(w) {
            var body = new CANNON.Body({mass:0, shape:wallShape, material:wallMaterial});
            body.position.set(w.pos[0],w.pos[1],w.pos[2]);
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), w.rot[0]);
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), w.rot[1]);
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,0,1), w.rot[2]);
            Dice3D.Physics.world.addBody(body);
        });
    },
    step: function(dt) { this.world.step(1/60, dt, 3); }
};

Dice3D.DiceFactory = {
    diceColor: '#FFFFFF', numberColor: '#1C1C1E', autoNumberColor: true,
    getContrastColor: function(hex) {
        var c = hex.replace('#','');
        var r = parseInt(c.substr(0,2),16);
        var g = parseInt(c.substr(2,2),16);
        var b = parseInt(c.substr(4,2),16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? '#1C1C1E' : '#FFFFFF';
    },
    createFaceTexture: function(num, bgColor, numColor, size) {
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0,0,size,size);
        ctx.fillStyle = numColor;
        ctx.font = 'bold '+Math.round(size*0.4)+'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), size/2, size/2);
        var tex = new THREE.CanvasTexture(canvas);
        return tex;
    },
    createD6: function() {
        var geo = new THREE.BoxGeometry(1.8,1.8,1.8);
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        var values = [1,2,3,4,5,6];
        for(var i=0;i<6;i++) {
            materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(values[i],this.diceColor,numColor,256), roughness:0.3}));
        }
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var shape = new CANNON.Box(new CANNON.Vec3(0.9,0.9,0.9));
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D6', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var faces = [new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)];
            var values = [2,5,4,3,1,6];
            var maxDot = -Infinity, result = 1;
            for(var i=0;i<6;i++) {
                var wn = faces[i].clone().applyQuaternion(mesh.quaternion);
                var d = wn.dot(up);
                if(d>maxDot) { maxDot=d; result=values[i]; }
            }
            return result;
        }};
    },
    createD4: function() {
        var geo = new THREE.TetrahedronGeometry(1.2);
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        for(var i=0;i<4;i++) materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(i+1,this.diceColor,numColor,256), roughness:0.3}));
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var verts = [];
        var posAttr = geo.getAttribute('position');
        for(var i=0;i<posAttr.count;i++) verts.push(new CANNON.Vec3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)));
        var faces = [];
        for(var i=0;i<geo.index.count;i+=3) faces.push([geo.index.getX(i),geo.index.getX(i+1),geo.index.getX(i+2)]);
        var shape = new CANNON.ConvexPolyhedron(verts,faces);
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D4', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var minDot = Infinity, result = 1;
            var posAttr = geo.getAttribute('position');
            for(var i=0;i<4;i++) {
                var v = new THREE.Vector3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)).applyQuaternion(mesh.quaternion);
                var d = v.dot(up);
                if(d<minDot) { minDot=d; result=i+1; }
            }
            return result;
        }};
    },
    createD8: function() {
        var geo = new THREE.OctahedronGeometry(1.2);
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        for(var i=0;i<8;i++) materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(i+1,this.diceColor,numColor,256), roughness:0.3}));
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var verts = [];
        var posAttr = geo.getAttribute('position');
        for(var i=0;i<posAttr.count;i++) verts.push(new CANNON.Vec3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)));
        var faces = [];
        for(var i=0;i<geo.index.count;i+=3) faces.push([geo.index.getX(i),geo.index.getX(i+1),geo.index.getX(i+2)]);
        var shape = new CANNON.ConvexPolyhedron(verts,faces);
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D8', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var maxDot = -Infinity, result = 1;
            var posAttr = geo.getAttribute('position');
            for(var i=0;i<6;i++) {
                var v = new THREE.Vector3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)).applyQuaternion(mesh.quaternion);
                var d = v.dot(up);
                if(d>maxDot) { maxDot=d; result=i<4?i+1:(9-i); }
            }
            return result;
        }};
    },
    createD20: function() {
        var geo = new THREE.IcosahedronGeometry(1.1);
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        for(var i=0;i<20;i++) materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(i+1,this.diceColor,numColor,256), roughness:0.3}));
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var verts = [];
        var posAttr = geo.getAttribute('position');
        for(var i=0;i<posAttr.count;i++) verts.push(new CANNON.Vec3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)));
        var faces = [];
        for(var i=0;i<geo.index.count;i+=3) faces.push([geo.index.getX(i),geo.index.getX(i+1),geo.index.getX(i+2)]);
        var shape = new CANNON.ConvexPolyhedron(verts,faces);
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D20', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var maxDot = -Infinity, result = 1;
            var posAttr = geo.getAttribute('position');
            for(var i=0;i<12;i++) {
                var v = new THREE.Vector3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)).applyQuaternion(mesh.quaternion);
                var d = v.dot(up);
                if(d>maxDot) { maxDot=d; result=(i%10)+1; }
            }
            return result;
        }};
    },
    createD10: function() {
        var geo = this.createD10Geometry();
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        var values = [0,1,2,3,4,5,6,7,8,9];
        for(var i=0;i<10;i++) materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(values[i],this.diceColor,numColor,256), roughness:0.3}));
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var shape = this.createD10Shape();
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D10', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var maxDot = -Infinity, result = 0;
            var normals = this.getD10Normals();
            for(var i=0;i<normals.length;i++) {
                var wn = normals[i].clone().applyQuaternion(mesh.quaternion);
                var d = wn.dot(up);
                if(d>maxDot) { maxDot=d; result=i; }
            }
            return result;
        }};
    },
    createD10Geometry: function() {
        var geo = new THREE.BufferGeometry();
        var phi = (1+Math.sqrt(5))/2;
        var verts = [];
        for(var i=0;i<5;i++) {
            var a = i * Math.PI * 2 / 5;
            verts.push(Math.cos(a), phi, Math.sin(a));
            verts.push(Math.cos(a), -phi, Math.sin(a));
        }
        var indices = [];
        for(var i=0;i<5;i++) {
            var j=(i+1)%5, k=(i+2)%5;
            indices.push(i*2, j*2+1, i*2+1);
            indices.push(i*2, j*2, j*2+1);
            indices.push(i*2+1, j*2+1, k*2+1);
            indices.push(i*2+1, k*2+1, k*2);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    },
    createD10Shape: function() {
        var phi = (1+Math.sqrt(5))/2;
        var verts = [];
        for(var i=0;i<5;i++) {
            var a = i * Math.PI * 2 / 5;
            verts.push(new CANNON.Vec3(Math.cos(a), phi, Math.sin(a)));
            verts.push(new CANNON.Vec3(Math.cos(a), -phi, Math.sin(a)));
        }
        var faces = [];
        for(var i=0;i<5;i++) {
            var j=(i+1)%5, k=(i+2)%5;
            faces.push([i*2, j*2+1, i*2+1]);
            faces.push([i*2, j*2, j*2+1]);
            faces.push([i*2+1, j*2+1, k*2+1]);
            faces.push([i*2+1, k*2+1, k*2]);
        }
        return new CANNON.ConvexPolyhedron(verts,faces);
    },
    getD10Normals: function() {
        var normals = [];
        var phi = (1+Math.sqrt(5))/2;
        for(var i=0;i<5;i++) {
            var a = i * Math.PI * 2 / 5;
            normals.push(new THREE.Vector3(Math.cos(a), phi/Math.sqrt(1+phi*phi), Math.sin(a)).normalize());
            normals.push(new THREE.Vector3(Math.cos(a), -phi/Math.sqrt(1+phi*phi), Math.sin(a)).normalize());
        }
        return normals;
    },
    createD12: function() {
        var geo = new THREE.DodecahedronGeometry(1.1);
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        for(var i=0;i<12;i++) materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(i+1,this.diceColor,numColor,256), roughness:0.3}));
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var verts = [];
        var posAttr = geo.getAttribute('position');
        for(var i=0;i<posAttr.count;i++) verts.push(new CANNON.Vec3(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i)));
        var faces = [];
        for(var i=0;i<geo.index.count;i+=3) faces.push([geo.index.getX(i),geo.index.getX(i+1),geo.index.getX(i+2)]);
        var shape = new CANNON.ConvexPolyhedron(verts,faces);
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D12', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var maxDot = -Infinity, result = 1;
            var normals = this.getD12Normals();
            for(var i=0;i<normals.length;i++) {
                var wn = normals[i].clone().applyQuaternion(mesh.quaternion);
                var d = wn.dot(up);
                if(d>maxDot) { maxDot=d; result=i+1; }
            }
            return result;
        }};
    },
    getD12Normals: function() {
        var normals = [];
        var phi = (1+Math.sqrt(5))/2;
        var pts = [[0,phi,1/phi],[0,phi,-1/phi],[0,-phi,1/phi],[0,-phi,-1/phi],[phi,1/phi,0],[phi,-1/phi,0],[-phi,1/phi,0],[-phi,-1/phi,0],[1/phi,0,phi],[1/phi,0,-phi],[-1/phi,0,phi],[-1/phi,0,-phi]];
        for(var i=0;i<12;i++) normals.push(new THREE.Vector3(pts[i][0],pts[i][1],pts[i][2]).normalize());
        return normals;
    },
    createD100: function() {
        var geo = this.createD10Geometry();
        var numColor = this.autoNumberColor ? this.getContrastColor(this.diceColor) : this.numberColor;
        var materials = [];
        var values = [0,10,20,30,40,50,60,70,80,90];
        for(var i=0;i<10;i++) materials.push(new THREE.MeshStandardMaterial({map:this.createFaceTexture(values[i],this.diceColor,numColor,256), roughness:0.3}));
        var mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var shape = this.createD10Shape();
        var body = new CANNON.Body({mass:1, shape:shape});
        body.linearDamping = 0.2;
        body.angularDamping = 0.3;
        return {mesh:mesh, body:body, type:'D100', getFaceUp:function() {
            var up = new THREE.Vector3(0,1,0);
            var maxDot = -Infinity, result = 0;
            var normals = this.getD10Normals();
            for(var i=0;i<normals.length;i++) {
                var wn = normals[i].clone().applyQuaternion(mesh.quaternion);
                var d = wn.dot(up);
                if(d>maxDot) { maxDot=d; result=i*10; }
            }
            return result;
        }};
    },
    createDice: function(type) {
        switch(type) {
            case 'D4': return this.createD4();
            case 'D6': return this.createD6();
            case 'D8': return this.createD8();
            case 'D10': return this.createD10();
            case 'D12': return this.createD12();
            case 'D20': return this.createD20();
            case 'D100': return this.createD100();
            default: return this.createD6();
        }
    }
};

Dice3D.ThrowEngine = {
    dice: [], type: 'D6', count: 1, isThrowing: false,
    lastBounceTime: 0, settleFrames: 0, timeScale: 1,
    accelHistory: [], SHAKE_THRESHOLD: 15, SHAKE_COOLDOWN: 800, lastShakeTime: 0,
    init: function() {
        this.setupListeners();
    },
    setupListeners: function() {
        document.getElementById('throw-btn').addEventListener('click', this.throwDice.bind(this));
        document.getElementById('count-plus').addEventListener('click', function() {
            if(Dice3D.ThrowEngine.count<10) { Dice3D.ThrowEngine.count++; document.getElementById('count-value').textContent=Dice3D.ThrowEngine.count; }
        });
        document.getElementById('count-minus').addEventListener('click', function() {
            if(Dice3D.ThrowEngine.count>1) { Dice3D.ThrowEngine.count--; document.getElementById('count-value').textContent=Dice3D.ThrowEngine.count; }
        });
        document.querySelectorAll('.type-btn').forEach(function(b) {
            b.addEventListener('click', function() {
                document.querySelector('.type-btn.active').classList.remove('active');
                this.classList.add('active');
                Dice3D.ThrowEngine.type = this.dataset.type;
            });
        });
    },
    createDice: function() {
        this.removeAllDice();
        for(var i=0;i<this.count;i++) {
            var d = Dice3D.DiceFactory.createDice(this.type);
            var offsetX = (i - (this.count-1)/2) * 1.5;
            var offsetZ = ((i%2)-0.5) * 1.5;
            d.mesh.position.set(offsetX, 6 + Math.random()*2, offsetZ);
            d.body.position.set(offsetX, 6 + Math.random()*2, offsetZ);
            Dice3D.Scene3D.scene.add(d.mesh);
            Dice3D.Physics.world.addBody(d.body);
            d.body.addEventListener('collide', this.onCollision.bind(this));
            this.dice.push(d);
        }
    },
    removeAllDice: function() {
        this.dice.forEach(function(d) {
            Dice3D.Scene3D.scene.remove(d.mesh);
            Dice3D.Physics.world.removeBody(d.body);
        });
        this.dice = [];
    },
    throwDice: function() {
        if(this.dice.length===0) this.createDice();
        Dice3D.Audio.playThrow();
        var now = Date.now();
        this.lastBounceTime = now;
        this.settleFrames = 0;
        this.isThrowing = true;
        this.dice.forEach(function(d) {
            var array = new Uint32Array(6);
            crypto.getRandomValues(array);
            var vx = (array[0]/4294967295-0.5)*10;
            var vy = 5 + Math.random()*5;
            var vz = (array[1]/4294967295-0.5)*10;
            d.body.velocity.set(vx, vy, vz);
            var wx = (array[2]/4294967295-0.5)*20;
            var wy = (array[3]/4294967295-0.5)*20;
            var wz = (array[4]/4294967295-0.5)*20;
            d.body.angularVelocity.set(wx, wy, wz);
        });
    },
    onCollision: function(e) {
        var now = Date.now();
        if(now - this.lastBounceTime > 50) {
            this.lastBounceTime = now;
            Dice3D.Audio.playBounce();
            if(Dice3D.UIController.getHapticEnabled()) {
                var impact = Math.min(255, Math.max(30, Math.round(e.contact.getImpactVelocityAlongNormal()*40)));
                Dice3D.Bridge.vibrateWithIntensity(15, impact);
            }
        }
    },
    update: function(dt) {
        Dice3D.Physics.step(dt * this.timeScale);
        this.dice.forEach(function(d) {
            d.mesh.position.copy(d.body.position);
            d.mesh.quaternion.copy(d.body.quaternion);
        });
        if(this.isThrowing) {
            var settled = true;
            this.dice.forEach(function(d) {
                if(d.body.velocity.length() > 0.05 || d.body.angularVelocity.length() > 0.1) settled = false;
            });
            if(settled) {
                this.settleFrames++;
                if(this.settleFrames >= 30) {
                    this.isThrowing = false;
                    this.onSettle();
                }
            } else {
                this.settleFrames = 0;
            }
        }
    },
    onSettle: function() {
        var results = [];
        this.dice.forEach(function(d) { results.push(d.getFaceUp()); });
        var sum = results.reduce(function(a,b) { return a+b; }, 0);
        Dice3D.Audio.playLand();
        if(Dice3D.UIController.getHapticEnabled()) Dice3D.Bridge.vibrateWithIntensity(30, 153);
        Dice3D.UIController.showResult(sum, results);
        Dice3D.History.add(this.type, this.count, results, sum);
    },
    getDiceType: function() { return this.type; }
};

window.onAccelerometer = function(x,y,z) {
    var mag = Math.sqrt(x*x+y*y+z*z);
    Dice3D.ThrowEngine.accelHistory.push({mag:mag, time:Date.now()});
    if(Dice3D.ThrowEngine.accelHistory.length>10) Dice3D.ThrowEngine.accelHistory.shift();
    if(!Dice3D.UIController.getGyroEnabled()) return;
    if(Dice3D.ThrowEngine.accelHistory.length<3) return;
    var now = Date.now();
    if(now - Dice3D.ThrowEngine.lastShakeTime < Dice3D.ThrowEngine.SHAKE_COOLDOWN) return;
    var recent = Dice3D.ThrowEngine.accelHistory.slice(-3);
    var delta = Math.abs(recent[2].mag - recent[0].mag);
    if(delta > Dice3D.ThrowEngine.SHAKE_THRESHOLD && recent[2].mag > 20) {
        Dice3D.ThrowEngine.lastShakeTime = now;
        Dice3D.ThrowEngine.throwDice();
    }
};

Dice3D.CameraControls = {
    target: new THREE.Vector3(0,0,0), distance: 16, theta: Math.PI/4, phi: Math.PI/4,
    isDragging: false, lastX: 0, lastY: 0, targetDistance: 16, targetTheta: Math.PI/4,
    init: function() {
        var canvas = Dice3D.Scene3D.renderer.domElement;
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        document.getElementById('reset-cam-btn').addEventListener('click', this.reset.bind(this));
    },
    onTouchStart: function(e) {
        if(e.touches.length === 1) {
            this.isDragging = true;
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
        }
    },
    onTouchMove: function(e) {
        e.preventDefault();
        if(e.touches.length === 1 && this.isDragging) {
            var dx = e.touches[0].clientX - this.lastX;
            var dy = e.touches[0].clientY - this.lastY;
            this.targetTheta += dx * 0.01;
            this.targetPhi = Math.max(0.2, Math.min(Math.PI-0.2, this.targetPhi + dy * 0.01));
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
        } else if(e.touches.length === 2) {
            var dist = Math.sqrt(Math.pow(e.touches[0].clientX-e.touches[1].clientX,2)+Math.pow(e.touches[0].clientY-e.touches[1].clientY,2));
            if(this.lastPinchDist) {
                var delta = dist - this.lastPinchDist;
                this.targetDistance = Math.max(8, Math.min(30, this.targetDistance - delta * 0.1));
            }
            this.lastPinchDist = dist;
        }
    },
    onTouchEnd: function(e) {
        this.isDragging = false;
        this.lastPinchDist = null;
    },
    reset: function() {
        this.targetTheta = Math.PI/4;
        this.targetPhi = Math.PI/4;
        this.targetDistance = 16;
    },
    update: function() {
        this.theta += (this.targetTheta - this.theta) * 0.1;
        this.phi += (this.targetPhi - this.phi) * 0.1;
        this.distance += (this.targetDistance - this.distance) * 0.1;
        var x = this.distance * Math.sin(this.phi) * Math.cos(this.theta);
        var y = this.distance * Math.cos(this.phi);
        var z = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
        Dice3D.Scene3D.camera.position.set(x, y, z);
        Dice3D.Scene3D.camera.lookAt(this.target);
    }
};

Dice3D.UIController = {
    settings: {showSum:true, soundEnabled:true, hapticEnabled:true, gyroEnabled:false, speed:1},
    init: function() {
        this.loadSettings();
        this.setupListeners();
    },
    loadSettings: function() {
        var saved = Dice3D.Bridge.loadFromStorage('diceSettings');
        if(saved) {
            this.settings = JSON.parse(saved);
            document.getElementById('show-sum').checked = this.settings.showSum;
            document.getElementById('sound-enabled').checked = this.settings.soundEnabled;
            document.getElementById('haptic-enabled').checked = this.settings.hapticEnabled;
            document.getElementById('gyro-enabled').checked = this.settings.gyroEnabled;
            document.getElementById('speed-slider').value = this.settings.speed;
            document.getElementById('speed-value').textContent = this.settings.speed+'x';
            Dice3D.ThrowEngine.timeScale = this.settings.speed;
        }
    },
    saveSettings: function() {
        Dice3D.Bridge.saveToStorage('diceSettings', JSON.stringify(this.settings));
    },
    setupListeners: function() {
        document.getElementById('show-sum').addEventListener('change', function() {
            Dice3D.UIController.settings.showSum = this.checked;
            Dice3D.UIController.saveSettings();
        });
        document.getElementById('sound-enabled').addEventListener('change', function() {
            Dice3D.UIController.settings.soundEnabled = this.checked;
            Dice3D.Audio.enabled = this.checked;
            Dice3D.UIController.saveSettings();
        });
        document.getElementById('haptic-enabled').addEventListener('change', function() {
            Dice3D.UIController.settings.hapticEnabled = this.checked;
            Dice3D.UIController.saveSettings();
        });
        document.getElementById('gyro-enabled').addEventListener('change', function() {
            Dice3D.UIController.settings.gyroEnabled = this.checked;
            if(this.checked) Dice3D.Bridge.requestSensorPermission();
            Dice3D.UIController.saveSettings();
        });
        document.getElementById('speed-slider').addEventListener('input', function() {
            Dice3D.UIController.settings.speed = parseFloat(this.value);
            document.getElementById('speed-value').textContent = this.value+'x';
            Dice3D.ThrowEngine.timeScale = Dice3D.UIController.settings.speed;
            Dice3D.UIController.saveSettings();
        });
        document.getElementById('speed-reset').addEventListener('click', function() {
            document.getElementById('speed-slider').value = 1;
            document.getElementById('speed-value').textContent = '1.0x';
            Dice3D.UIController.settings.speed = 1;
            Dice3D.ThrowEngine.timeScale = 1;
            Dice3D.UIController.saveSettings();
        });
        document.getElementById('dice-color').addEventListener('input', function() {
            Dice3D.DiceFactory.diceColor = this.value;
        });
        document.getElementById('auto-num-color').addEventListener('change', function() {
            Dice3D.DiceFactory.autoNumberColor = this.checked;
        });
        document.getElementById('settings-btn').addEventListener('click', function() {
            document.getElementById('settings-overlay').classList.add('active');
            document.getElementById('settings-panel').classList.add('active');
        });
        document.getElementById('settings-close').addEventListener('click', function() {
            document.getElementById('settings-overlay').classList.remove('active');
            document.getElementById('settings-panel').classList.remove('active');
        });
        document.getElementById('settings-overlay').addEventListener('click', function() {
            document.getElementById('settings-overlay').classList.remove('active');
            document.getElementById('settings-panel').classList.remove('active');
        });
        document.getElementById('history-btn').addEventListener('click', function() {
            document.getElementById('history-overlay').classList.add('active');
            document.getElementById('history-panel').classList.add('active');
            Dice3D.History.render();
        });
        document.getElementById('history-close').addEventListener('click', function() {
            document.getElementById('history-overlay').classList.remove('active');
            document.getElementById('history-panel').classList.remove('active');
        });
        document.getElementById('history-overlay').addEventListener('click', function() {
            document.getElementById('history-overlay').classList.remove('active');
            document.getElementById('history-panel').classList.remove('active');
        });
        document.getElementById('clear-history-btn').addEventListener('click', function() {
            if(confirm('确定要清除所有历史记录吗？')) {
                Dice3D.History.clearAll();
                Dice3D.History.render();
            }
        });
        document.getElementById('stats-btn').addEventListener('click', function() {
            Dice3D.StatsChart.show(Dice3D.ThrowEngine.getDiceType());
        });
        document.getElementById('stats-close').addEventListener('click', function() {
            Dice3D.StatsChart.hide();
        });
        document.getElementById('stats-overlay').addEventListener('click', function() {
            Dice3D.StatsChart.hide();
        });
    },
    showResult: function(sum, results) {
        var el = document.getElementById('result-value');
        el.textContent = sum;
        el.style.animation = 'none';
        setTimeout(function() { el.style.animation = 'popIn 0.3s ease-out'; }, 10);
    },
    getHapticEnabled: function() { return this.settings.hapticEnabled; },
    getGyroEnabled: function() { return this.settings.gyroEnabled; }
};

Dice3D.History = {
    records: [],
    init: function() {
        var saved = Dice3D.Bridge.loadFromStorage('diceHistory');
        if(saved) this.records = JSON.parse(saved);
    },
    add: function(type, count, results, sum) {
        this.records.unshift({
            id: Date.now(),
            timestamp: new Date().toLocaleString('zh-CN'),
            type: type,
            count: count,
            results: results,
            sum: sum
        });
        if(this.records.length > 100) this.records.pop();
        Dice3D.Bridge.saveToStorage('diceHistory', JSON.stringify(this.records));
    },
    render: function() {
        var list = document.getElementById('history-list');
        if(this.records.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#8E8E93;padding:40px;">暂无投掷记录</div>';
            return;
        }
        list.innerHTML = this.records.map(function(r) {
            return '<div class="history-item"><div class="history-header"><span class="history-type">'+r.type+' x'+r.count+'</span><span class="history-time">'+r.timestamp+'</span></div><div class="history-results">'+r.results.join(', ')+'</div><div class="history-sum">总和: '+r.sum+'</div><button class="delete-btn" data-id="'+r.id+'">删除</button></div>';
        }).join('');
        document.querySelectorAll('.delete-btn').forEach(function(b) {
            b.addEventListener('click', function() {
                Dice3D.History.delete(this.dataset.id);
            });
        });
    },
    delete: function(id) {
        this.records = this.records.filter(function(r) { return r.id != id; });
        Dice3D.Bridge.saveToStorage('diceHistory', JSON.stringify(this.records));
        this.render();
    },
    clearAll: function() {
        this.records = [];
        Dice3D.Bridge.saveToStorage('diceHistory', '[]');
    },
    getStats: function(type) {
        var filtered = this.records.filter(function(r) { return r.type === type; });
        var counts = {};
        filtered.forEach(function(r) {
            r.results.forEach(function(v) {
                counts[v] = (counts[v] || 0) + 1;
            });
        });
        return counts;
    }
};

Dice3D.StatsChart = {
    show: function(type) {
        document.getElementById('stats-overlay').classList.add('active');
        document.getElementById('stats-panel').classList.add('active');
        this.draw(type);
    },
    hide: function() {
        document.getElementById('stats-overlay').classList.remove('active');
        document.getElementById('stats-panel').classList.remove('active');
    },
    draw: function(type) {
        var canvas = document.getElementById('stats-chart');
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        var stats = Dice3D.History.getStats(type);
        var values = Object.keys(stats).map(Number).sort(function(a,b) { return a-b; });
        if(values.length === 0) {
            ctx.fillStyle = '#8E8E93';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无统计数据', canvas.width/2, canvas.height/2);
            return;
        }
        var maxCount = Math.max.apply(null, values.map(function(v) { return stats[v]; }));
        var barWidth = canvas.width / values.length * 0.6;
        var gap = canvas.width / values.length * 0.4;
        var padding = 30;
        var chartHeight = canvas.height - padding*2;
        ctx.fillStyle = '#007AFF';
        values.forEach(function(v, i) {
            var x = padding + i*(barWidth+gap) + gap/2;
            var height = (stats[v]/maxCount) * chartHeight;
            var y = canvas.height - padding - height;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, height, 4);
            ctx.fill();
            ctx.fillStyle = document.body.getAttribute('data-theme') === 'dark' ? '#E5E5EA' : '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(v.toString(), x+barWidth/2, canvas.height - 10);
        });
    }
};

Dice3D.GameLoop = {
    lastTime: 0,
    start: function() {
        this.lastTime = performance.now();
        this.loop();
    },
    loop: function() {
        var now = performance.now();
        var dt = (now - Dice3D.GameLoop.lastTime) / 1000;
        Dice3D.GameLoop.lastTime = now;
        Dice3D.CameraControls.update();
        Dice3D.ThrowEngine.update(dt);
        Dice3D.Scene3D.render();
        requestAnimationFrame(Dice3D.GameLoop.loop);
    }
};

window.addEventListener('DOMContentLoaded', function() {
    Dice3D.Audio.init();
    Dice3D.Scene3D.init(document.getElementById('scene-container'));
    Dice3D.Physics.init();
    Dice3D.Theme.init();
    Dice3D.History.init();
    Dice3D.UIController.init();
    Dice3D.ThrowEngine.init();
    Dice3D.CameraControls.init();
    Dice3D.GameLoop.start();
});

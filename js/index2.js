$('.js-btn-play').on('click',function(){
    console.log("aaaa")
    $('.p-raider').addClass('fn-hide');
    Snake(true,);
})

var Snake = function(show_red,overCB){
    var cnv = document.getElementById('gameCanvas'),
        g_source;
    cnv.width = $('.js-can-wrap').width();
    cnv.height = $('.js-can-wrap').height();
    var ctx = cnv.getContext('2d'),
    // 一截蛇长
    segmentLength = 7,
    // 初始蛇段数
    startingSegments = 3,
    //蛇初始化位置
    spawn = {
        x: 50,
        y: cnv.height / 2
    },
    // 速度
    snakeSpeed = 4,
    // 最大苹果数
    maxApples = 3,
    appleLife = 500,
    bagLife = 500,
    segmentsPerApple = 1,

    snakeWidth = 14,
    appleWidth = 14,
    bagWidth = 25,
    bagHeight = 28,

    //颜色
    appleColor = [[54,0,"#1ec77e"],[54,30,"#3d79d1"],[34,60,"#eaa218"]],

    snake,
    target,
    apples,
    redbags,
    score,
    gameState,
    deathMeans,
    getRebdag = false,
    time = 0;

    
    this.is_bag = show_red?true:false;
    this.isOver = false;


    function distance(p1, p2) {
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    function lineIntersect(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
        var s1_x = p1_x - p0_x,
        s1_y = p1_y - p0_y,
        s2_x = p3_x - p2_x,
        s2_y = p3_y - p2_y,
        s = ( - s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / ( - s2_x * s1_y + s1_x * s2_y),
        t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / ( - s2_x * s1_y + s1_x * s2_y);

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
            return true;
        }

        return false;
    }

    function SGM(angle, x, y) {
        this.x = x || 0;
        this.y = y || 0;
        this.angle = angle || 0;
        this.parent = null;
    };

    SGM.prototype.endX = function() {
        return this.x + Math.cos(this.angle) * segmentLength;
    };

    SGM.prototype.endY = function() {
        return this.y + Math.sin(this.angle) * segmentLength;
    };

    SGM.prototype.pointAt = function(x, y) {
        var dx = x - this.x,
        dy = y - this.y;

        this.angle = Math.atan2(dy, dx);
    };

    SGM.prototype.target = function(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.arrived = false;
        this.totalDist = distance({
            x: this.endX(),
            y: this.endY()
        },
        {
            x: this.targetX,
            y: this.targetY
        });
        this.currentDist = parseInt(this.totalDist);
    };

    SGM.prototype.gotoTarget = function() {
        if (!this.arrived) {
            if (this.targetX > this.x + segmentLength || this.targetX < this.x - segmentLength || this.targetY > this.y + segmentLength || this.targetY < this.y - segmentLength) {
                this.pointAt(this.targetX, this.targetY);
            } else {
                this.arrived = true;
            }

            this.currentDist = distance({
                x: this.endX(),
                y: this.endY()
            },
            {
                x: this.targetX,
                y: this.targetY
            });
        }

        this.x += (this.endX() - this.x) / snakeSpeed;
        this.y += (this.endY() - this.y) / snakeSpeed;

        this.parent.drag(this.x, this.y);
    };

    SGM.prototype.drag = function(x, y) {
        this.pointAt(x, y);

        this.x = x - Math.cos(this.angle) * segmentLength;
        this.y = y - Math.sin(this.angle) * segmentLength;

        if (this.parent) {
            this.parent.drag(this.x, this.y);
        }
    };

    SGM.prototype.render = function(context) {
        context.lineTo(this.endX() + 0.5, this.endY() + 0.5);
    };

    function IKR(x, y) {
        this.ix = x || 0;
        this.iy = y || 0;
        this.sgms = [];
        this.lastArm = null;
    };

    IKR.prototype.addSeg = function(angle) {
        var arm = new SGM(angle);

        if (this.lastArm !== null) {
            arm.x = this.lastArm.endX();
            arm.y = this.lastArm.endY();

            arm.parent = this.lastArm;
        } else {
            arm.x = this.ix;
            arm.y = this.iy;
        }

        this.sgms.push(arm);
        this.lastArm = arm;
    };

    IKR.prototype.grow = function() {
        var tail = this.sgms[0],
        arm = new SGM(tail.angle);

        arm.x = tail.x - Math.cos(tail.angle) * segmentLength;
        arm.y = tail.y - Math.sin(tail.angle) * segmentLength;

        tail.parent = arm;
        this.sgms.unshift(arm);

    }

    IKR.prototype.drag = function(x, y) {
        this.lastArm.drag(x, y);
    };

    function CUR(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = 0;
    };

    CUR.prototype.render = function(context) {
        context.save();

        context.translate(this.x, this.y);
        context.rotate(this.rotation);

        context.beginPath();

        context.moveTo(0, -5);
        context.lineTo(0, -2.5);
        context.moveTo(0, 2.5);
        context.lineTo(0, 5);

        context.moveTo( - 5, 0);
        context.lineTo( - 2.5, 0);
        context.moveTo(2.5, 0);
        context.lineTo(5, 0);

        context.stroke();
        context.restore();

        this.rotation = (this.rotation +  0.075) % 360;
    };

    function Bag_w(x, y) {
        this.x = x;
        this.y = y;
        this.size = 25;
        this.length = 20;
        this.speed = 0.1;
    };

    Bag_w.prototype.render = function(context) {
        if(this.img){
            this.num ++;
            if(this.num >=47){
                this.n++;
                if(this.n >=30){
                    this.num = 0;
                    this.n = 0;;
                }
            }
            context.drawImage(this.img, 116*this.num,0,116,116,this.x-29, this.y-29, 58, 58);
        }
    }

    /*function Bag_w(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 0.1;
        this.len = 0;
    };

    Bag_w.prototype.render = function(context) {
        context.save();

        
        if(this.len >= 6){
            this.len = 0;
        }
        this.len += 0.1;

        context.translate(this.x, this.y);

        context.beginPath();

        context.moveTo(-0, -16);
        context.lineTo(-0, -16-this.len);
        context.moveTo(0, 16);
        context.lineTo(0, 16+this.len);

        context.moveTo( - 16, 0);
        context.lineTo( - 16-this.len, 0);
        context.moveTo(16, 0);
        context.lineTo(16+this.len, 0);

        context.moveTo( - 16, -16);
        context.lineTo( - 16-this.len/2, -16-this.len/2);
        context.moveTo(16, 16);
        context.lineTo(16+this.len/2, 16+this.len/2);

        context.moveTo(  16, -16);
        context.lineTo(  16+this.len/2, -16-this.len/2);
        context.moveTo(-16, 16);
        context.lineTo(-16-this.len/2, 16+this.len/2);


        context.stroke();
        context.restore();

    }*/

    function Redbag(x, y) {
        this.x = x;
        this.y = y;
        this.life = bagLife;
        this.rotation = 0;
        var img = new Image();
        img.src = "http://cimg1.fenqile.com/ibanner/M00/01/06/wScJAFklZlyAS6YiAAB0-SVXrk8443.png";
        this.img = img;
        this.num = 0;
        this.n = 0;
        this.len = 0;
    }


    Redbag.prototype.update = function() {
        this.life--;
    };

    Redbag.prototype.render = function(context) {
        context.drawImage(g_source, 0,0,50,56,this.x-bagWidth/2, this.y-bagHeight/2, bagWidth, bagHeight);
        if (gameState !== 'dead') {
            context.save();

            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.font = '11px pingfang';
            context.fillText(this.life, this.x, this.y+bagHeight/4,bagWidth);
            context.restore();

            context.strokeStyle = "#ed524f";
            context.lineWidth = 2;
            Bag_w.prototype.render.call(this, context);
           
        }
    };

    function Apple(x, y) {
        this.x = x;
        this.y = y;
        this.life = appleLife;
        this.rotation = 0;
        this.index = ~~(Math.random()*100%3);
    }

    Apple.prototype.update = function() {
        this.life--;
    };

    Apple.prototype.render = function(context) {
        context.drawImage(g_source,appleColor[this.index][0],appleColor[this.index][1],27,27,this.x - appleWidth/2, this.y - appleWidth/2, appleWidth, appleWidth);
        if (gameState !== 'dead') {
            context.save();
            context.fillStyle = appleColor[this.index][2];
            context.font = '11px pingfang';
            context.textAlign = 'center';
            context.fillText(this.life, this.x, this.y + appleWidth+5);
            context.restore();
        }
    };

    var stats;
    var init = function() {
        if(document.getElementById('g_source')){
            g_source = document.getElementById('g_source');
        }
        else{
            var img = new Image();
            img.src = "http://cimg1.fenqile.com/ibanner/M00/00/F3/wycJAFkiqyWANOtbAAAeGd2H_Hc865.png";
            g_source = img;
        }

        init_game();

        stats = new Stats();  
        stats.domElement.style.position = 'absolute'; //绝对坐标  
        stats.domElement.style.left = '50px';// (0,0)px,左上角  
        stats.domElement.style.top = '300px';  
        document.body.appendChild(stats.domElement);  
    }

    var init_game = function(){
        time = 0;
        // window.clearInterval(borrow_roll.handle);
        // borrow_roll.handle = null;
        // window.pic_swiper.stopAutoplay();
        snake = new IKR(spawn.x, spawn.y);
        target = new CUR(spawn.x + segmentLength * (startingSegments + 5), spawn.y);
        apples = [];
        redbags = [];
        score = 0;
        snakeSpeed = 6;
        for (var i = 0; i < startingSegments; i++) {
            snake.addSeg();
        }
        getRebdag = false;
        snake.lastArm.target(target.x, target.y);

        gameState = 'play';

        this.isOver = false;
    }

     init();

    cnv.addEventListener('mousemove',
    function(e) {
        switch (gameState) {
        case 'play':
            /*cursor.x = e.offsetX;
            cursor.y = e.offsetY;*/
            break;
        }
    });

    cnv.addEventListener('mousedown',downFN);

    function downFN(e){
        switch (gameState) {
            case 'play':
                target.x = e.offsetX;
                target.y = e.offsetY;
                snake.lastArm.target(target.x, target.y);
                break;
            case 'dead':
                //如果还有次数，就可以再玩 init();
                //init();
                break;
        }
    }

    function badPlacement(apple, width) {
        for (var s = 0,length = snake.sgms.length; s < length; s++) {
            var seg = snake.sgms[s];
            if (Math.min(distance(apple, {
                x: seg.endX(),
                y: seg.endY()
            }), distance(apple, {
                x: seg.x,
                y: seg.y
            })) < width*2) {
                return true;
            }
        }
        return false;
    }

    function addScoreSegments() {
        for (var i = 0; i < segmentsPerApple; i++) {
            snake.grow();
        }
    }

    function update() {
        if (gameState !== 'dead') {
            snake.lastArm.gotoTarget();
            /*if( this.time<=0){
                gameState = 'dead';
                deathMeans = 'Time out';
                borrow_roll.start();
                window.pic_swiper.startAutoplay();
                return;
            }*/
            if (snake.lastArm.endX() > cnv.width - 2 || snake.lastArm.endX() < 2 || snake.lastArm.endY() > cnv.height - 2 || snake.lastArm.endY() < 2) {
                gameState = 'dead';
                deathMeans = 'You hit the wall...';
                // borrow_roll.start();
                // window.pic_swiper.startAutoplay();
                return;
            }

            for (var s = 0; s < snake.sgms.length - 2; s++) {
                var seg = snake.sgms[s];

                if (lineIntersect(snake.lastArm.x, snake.lastArm.y, snake.lastArm.endX(), snake.lastArm.endY(), seg.x, seg.y, seg.endX(), seg.endY())) {
                    gameState = 'dead';
                    deathMeans = 'You bit yourself!';
                    borrow_roll.start();
                    window.pic_swiper.startAutoplay();
                    return;
                }

                for (var a in apples) {
                    var apple = apples[a];

                    if (Math.min(distance(apple, {
                        x: seg.endX(),
                        y: seg.endY()
                    }), distance(apple, {
                        x: seg.x,
                        y: seg.y
                    })) < appleWidth) {
                        score += Math.round(apple.life / 2); 
                        apples.splice(a, 1);
                        addScoreSegments();
                    }
                }

                for (var a in redbags) {
                    var redbag = redbags[a];

                    if (Math.min(distance(redbag, {
                        x: seg.endX(),
                        y: seg.endY()
                    }), distance(redbag, {
                        x: seg.x,
                        y: seg.y
                    })) < bagWidth) {
                        score += Math.round(redbag.life / 2); // half  score if absorbed by the tail
                        redbags.splice(a, 1);
                        addScoreSegments();
                    }
                }
            }

            for (var a in redbags) {
                var redbag = redbags[a];

                redbag.update();

                if (redbag.life <= 0) {
                    redbags.splice(a, 1);
                    continue;
                }

                if (distance(redbag, {
                    x: snake.lastArm.endX(),
                    y: snake.lastArm.endY()
                }) < bagWidth*1.2) {
                    score += redbag.life;
                    redbags.splice(a, 1);
                    getRebdag = true;
                    addScoreSegments();
                }
            }

            for (var a in apples) {
                var apple = apples[a];

                apple.update();

                if (apple.life <= 0) {
                    apples.splice(a, 1);
                    continue;
                }

                if (distance(apple, {
                    x: snake.lastArm.endX(),
                    y: snake.lastArm.endY()
                }) < appleWidth) {
                    score += apple.life;
                    var s_speed = speedAdd(score,snakeSpeed);
                    snakeSpeed = s_speed;
                    apples.splice(a, 1);

                    addScoreSegments();
                }
            }
            if(time<1200){
                time++;
            }
            if (redbags.length < 1 && this.is_bag && time>600 && Math.random() < .05) {
                var offset = bagWidth *5,
                redbag = new Redbag(offset / 2 + Math.floor(Math.random() * (cnv.width - offset)), offset / 2 + Math.floor(Math.random() * (cnv.height - offset)));
                this.is_bag = false;
                while (badPlacement(redbag, bagWidth)) {
                    redbag.x = offset / 2 + Math.floor(Math.random() * (cnv.width - offset));
                    redbag.y = offset / 2 + Math.floor(Math.random() * (cnv.height - offset));
                }
                redbags.push(redbag);
            }

            if (apples.length < maxApples && Math.random() < .1) {
                var offset = appleWidth * 5,
                apple = new Apple(offset / 2 + Math.floor(Math.random() * (cnv.width - offset)), offset / 2 + Math.floor(Math.random() * (cnv.height - offset)));
                while (badPlacement(apple, appleWidth)) {
                    apple.x = offset / 2 + Math.floor(Math.random() * (cnv.width - offset));
                    apple.y = offset / 2 + Math.floor(Math.random() * (cnv.height - offset));
                }
                apples.push(apple);
            }
        }
    }

    //ro snakeSpeed 增加
    function speedAdd(score,s_speed){
        var now_speed = s_speed;
        if(score - (4-s_speed)*2000>(4000 + 6000*(4-s_speed))){
            now_speed--;
            now_speed = now_speed > 2 ? now_speed : 2;
        }

        return now_speed;
    }

    function drawTarget(targetModFactor) {
        if (!snake.lastArm.arrived) {
            ctx.strokeStyle = "#6a6865";
            ctx.lineWidth = 1;
            target.render(ctx);
        }
    }

    function drawSnake() {
        ctx.beginPath();
        var length = snake.sgms.length;
        ctx.lineCap = "round";
        ctx.lineJoin = "miter";
        ctx.miterLimit = 1;
        for (var i = 0; i < length; i++) {
            if (snake.sgms[i].x > cnv.width - 2) {
                snake.sgms[i].x -= cnv.width;
            }
            if (snake.sgms[i].x < 2) {
                snake.sgms[i].x += cnv.width;
            }
            if (snake.sgms[i].y > cnv.height - 2) {
                snake.sgms[i].y -= cnv.height;
            }
            if (snake.sgms[i].y < 2) {
                snake.sgms[i].y += cnv.height;
            } else {
                snake.sgms[i].render(ctx);
            }
        }
        ctx.save();
        ctx.strokeStyle = '#CA322E';
        ctx.lineWidth = snakeWidth+3;
        
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#f25955';
        ctx.lineWidth = snakeWidth;
        ctx.stroke();
        ctx.restore();



        ctx.save();
        ctx.translate(snake.lastArm.endX(),snake.lastArm.endY());
        ctx.rotate(snake.sgms[length-1].angle);
        ctx.drawImage(g_source, 0,60,30,30,-snakeWidth/2, -snakeWidth/2, snakeWidth, snakeWidth);
       

       
        ctx.restore();

    }


    function drawRedbags() {
        for (var a in redbags) {
            var redbag = redbags[a];
            redbag.render(ctx);
        }
    }

    function drawApples() {
        for (var a in apples) {
            var apple = apples[a];
           
            apple.render(ctx);
        }
    }

    function render() {
        var targetModFactor = 1 - snake.lastArm.currentDist / snake.lastArm.totalDist;
        /*if(snake){
            var targetModFactor = 1 - snake.lastArm.currentDist / snake.lastArm.totalDist;
        }
        else{
            return;
        }*/

        switch (gameState) {
        case 'play':
            ctx.clearRect(0, 0, cnv.width, cnv.height);

            drawTarget(targetModFactor);
            drawSnake();
            drawApples();
            drawRedbags();

            ctx.save();
            ctx.fillStyle = '#413a33';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.font = '700 13px pingfang';
            ctx.fillText('得分: ' + score, 10, 10);
            ctx.restore();
            ctx.save();
            ctx.fillStyle = '#413a33';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.font = '700 13px pingfang';
            ctx.fillText(this.time+"s", cnv.width-10, 10);
            ctx.restore();
            break;

        case 'dead':
            alert("Dead");
            snake = null;
            cnv.removeEventListener('mousedown',downFN);
            ctx.clearRect(0, 0, cnv.width, cnv.height);

            //回调
            $.isFunction(overCB) && !this.isOver && overCB(score,getRebdag);
            this.isOver = true;

            break;
        }
    }

    function animate() {
        stats.update();
        update();
        render();
        requestAnimationFrame(animate);
    }

    snake.lastArm.target(target.x, target.y);
    animate();

    return init_game;
}
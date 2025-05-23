//https://unpkg.com/leaflet-doubletapdrag@0.1.2/Leaflet.DoubleTapDrag.js
function DoubleTapDragInitHook() {
    var timer = null;
    var fired = false;
    var lastTimestamp = null;
    var DOUBLE_CLICK_TIMEOUT = 200;
    var WAIT_FOR_DRAG_END_TIMEOUT = 100;

    this._container.addEventListener('touchstart', L.Util.bind(function (e) {
    if (e.touches.length !== 1) {
        return;
    }
    var now = Date.now();
    if (lastTimestamp) {
        if (now - lastTimestamp < DOUBLE_CLICK_TIMEOUT) {
        timer = setTimeout(L.Util.bind(function () {
            this.fire('doubletapdragstart', e);
            timer = null;
            fired = true;
        }, this), WAIT_FOR_DRAG_END_TIMEOUT);
        }
        lastTimestamp = null;
    } else {
        lastTimestamp = Date.now();
        setTimeout(L.Util.bind(function () {
        lastTimestamp = null;
        }, this), DOUBLE_CLICK_TIMEOUT);
    }
    }, this));

    this._container.addEventListener('touchend', L.Util.bind(function (e) {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    if (fired) {
        this.fire('doubletapdragend', e);
        fired = null;
    }
    }, this));

    this._container.addEventListener('touchmove', L.Util.bind(function (e) {
    if (!fired) {
        return;
    }

    this.fire('doubletapdrag', e);
    }, this));
}

L.Map.addInitHook(DoubleTapDragInitHook);
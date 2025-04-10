/**
 * @description All functionality the users location.
 */

async function getRouteData(busStopY,busStopX,userY,userX){

    const response = await $.get(`/api/planroute?startY=${userY}&startX=${userX}&endY=${busStopY}&endX=${busStopX}`)
    return response;
}

export{getRouteData}
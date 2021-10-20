var modelo = null;

var labels = Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z');

//Carga de modelo
(async () => {
    console.log("Cargando modelo...");
    modelo = await tf.loadLayersModel("assets/js/model.json");
    console.log("Modelo cargado...");
})();

//Funcion de redimension de imagen canvas
function resample_single(canvas, width, height, resize_canvas) {
    var width_source = canvas.width;
    var height_source = canvas.height;
    width = Math.round(width);
    height = Math.round(height);

    var ratio_w = width_source / width;
    var ratio_h = height_source / height;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);

    var ctx = canvas.getContext("2d");
    var ctx2 = resize_canvas.getContext("2d");
    var img = ctx.getImageData(0, 0, width_source, height_source);
    var img2 = ctx2.createImageData(width, height);
    var data = img.data;
    var data2 = img2.data;

    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var x2 = (i + j * width) * 4;
            var weight = 0;
            var weights = 0;
            var weights_alpha = 0;
            var gx_r = 0;
            var gx_g = 0;
            var gx_b = 0;
            var gx_a = 0;
            var center_y = (j + 0.5) * ratio_h;
            var yy_start = Math.floor(j * ratio_h);
            var yy_stop = Math.ceil((j + 1) * ratio_h);
            for (var yy = yy_start; yy < yy_stop; yy++) {
                var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                var center_x = (i + 0.5) * ratio_w;
                var w0 = dy * dy; //pre-calc part of w
                var xx_start = Math.floor(i * ratio_w);
                var xx_stop = Math.ceil((i + 1) * ratio_w);
                for (var xx = xx_start; xx < xx_stop; xx++) {
                    var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                    var w = Math.sqrt(w0 + dx * dx);
                    if (w >= 1) {
                        //pixel too far
                        continue;
                    }
                    //hermite filter
                    weight = 2 * w * w * w - 3 * w * w + 1;
                    var pos_x = 4 * (xx + yy * width_source);
                    //alpha
                    gx_a += weight * data[pos_x + 3];
                    weights_alpha += weight;
                    //colors
                    if (data[pos_x + 3] < 255)
                        weight = weight * data[pos_x + 3] / 250;
                    gx_r += weight * data[pos_x];
                    gx_g += weight * data[pos_x + 1];
                    gx_b += weight * data[pos_x + 2];
                    weights += weight;
                }
            }
            data2[x2] = gx_r / weights;
            data2[x2 + 1] = gx_g / weights;
            data2[x2 + 2] = gx_b / weights;
            data2[x2 + 3] = gx_a / weights_alpha;
        }
    }

    //Ya que esta, exagerarlo. Blancos blancos y negros negros..?

    for (var p=0; p < data2.length; p += 4) {
        var gris = data2[p]; //Esta en blanco y negro

        if (gris < 100) {
            gris = 0; //exagerarlo
        } else {
            gris = 255; //al infinito
        }

        data2[p] = gris;
        data2[p+1] = gris;
        data2[p+2] = gris;
    }


    ctx2.putImageData(img2, 0, 0);
}

function predecir(){
    //save();

    bigCan = document.getElementById("can");
    smallCan = document.getElementById("smallcan");
    resample_single(can, 28, 28, smallCan);

    var ctx2 = smallCan.getContext("2d");
    var imgData = ctx2.getImageData(0,0,28,28);
    var arr = []; //El arreglo completo
    var arr28 = []; //Al llegar a 28 posiciones se pone en 'arr' como un nuevo indice
    for (var p=0, i=0; p < imgData.data.length; p+=4) {
        var valor = (imgData.data[p]+imgData.data[p+1]+imgData.data[p+2])/(255*3);
        valor = Math.abs(valor-1)
        console.log(p, valor)
        arr28.push([valor]); //Agregar al arr28 y normalizar a 0-1. Aparte queda dentro de un arreglo en el indice 0... again
        if (arr28.length == 28) {
            arr.push(arr28);
            arr28 = [];
        }
    }

    console.log(arr)
    arr = [arr]; //Meter el arreglo en otro arreglo por que si no tio tensorflow se enoja >:(
    //Nah basicamente Debe estar en un arreglo nuevo en el indice 0, por ser un tensor4d en forma 1, 28, 28, 1
    //console.log(arr);
    var tensor4 = tf.tensor4d(arr);
    var resultados = modelo.predict(tensor4.transpose()).dataSync();
    var mayorIndice = resultados.indexOf(Math.max.apply(null, resultados));


    
    console.log("Prediccion", mayorIndice, labels[mayorIndice]);
    document.getElementById("resultado").innerHTML = labels[mayorIndice];
}

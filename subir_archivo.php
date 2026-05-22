<?php
ob_start();

// CORS — siempre se envían, sin condición
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

// Responder preflight del browser y salir
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit();
}

// --- SEGURIDAD ---
$apiKeySecreta = "YUfyutVYTbyutVGYTcY&57576)(&/JkuY)";
$headers = array_change_key_case(getallheaders(), CASE_LOWER);
$authHeader = isset($headers['authorization']) ? trim($headers['authorization']) : '';

if ($authHeader !== $apiKeySecreta) {
    http_response_code(401);
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "No autorizado"]);
    exit();
}

// --- SUBIDA ---
$MAX_BYTES = 20 * 1024 * 1024; // 20MB

// Si el post excede post_max_size, $_POST y $_FILES llegan vacíos pero CONTENT_LENGTH viene poblado.
$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_FILES) && empty($_POST) && $contentLength > 0) {
    http_response_code(413);
    ob_end_clean();
    echo json_encode([
        "success" => false,
        "error" => "El archivo supera el limite del servidor (post_max_size). Subir un archivo de hasta 20MB."
    ]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['archivo'])) {
    $archivo = $_FILES['archivo'];

    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        $mensajes = [
            UPLOAD_ERR_INI_SIZE   => "El archivo supera upload_max_filesize del servidor.",
            UPLOAD_ERR_FORM_SIZE  => "El archivo supera el limite del formulario.",
            UPLOAD_ERR_PARTIAL    => "El archivo se subio parcialmente.",
            UPLOAD_ERR_NO_FILE    => "No se recibio archivo.",
            UPLOAD_ERR_NO_TMP_DIR => "Falta carpeta temporal en el servidor.",
            UPLOAD_ERR_CANT_WRITE => "No se pudo escribir el archivo.",
            UPLOAD_ERR_EXTENSION  => "Una extension de PHP detuvo la subida.",
        ];
        $codigoHttp = in_array($archivo['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 413 : 400;
        http_response_code($codigoHttp);
        ob_end_clean();
        echo json_encode([
            "success" => false,
            "error" => $mensajes[$archivo['error']] ?? "Error al subir el archivo."
        ]);
        exit();
    }

    if ($archivo['size'] > $MAX_BYTES) {
        http_response_code(413);
        ob_end_clean();
        echo json_encode(["success" => false, "error" => "El archivo supera el limite de 20MB."]);
        exit();
    }

    $dir = "uploads/";

    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }

    $nombreOriginal = preg_replace("/[^a-zA-Z0-9\._-]/", "", basename($archivo['name']));
    $nombre = time() . "_" . $nombreOriginal;
    $ruta = $dir . $nombre;

    if (move_uploaded_file($archivo['tmp_name'], $ruta)) {
        ob_end_clean();
        echo json_encode([
            "success" => true,
            "url" => "https://api.cuscodento.com/" . $ruta
        ]);
    } else {
        http_response_code(500);
        ob_end_clean();
        echo json_encode(["success" => false, "error" => "No se pudo mover el archivo. Revisa permisos de carpeta."]);
    }
} else {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Solicitud invalida"]);
}

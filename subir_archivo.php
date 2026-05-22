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
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['archivo'])) {
    $dir = "uploads/";

    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }

    $nombreOriginal = preg_replace("/[^a-zA-Z0-9\._-]/", "", basename($_FILES['archivo']['name']));
    $nombre = time() . "_" . $nombreOriginal;
    $ruta = $dir . $nombre;

    if (move_uploaded_file($_FILES['archivo']['tmp_name'], $ruta)) {
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

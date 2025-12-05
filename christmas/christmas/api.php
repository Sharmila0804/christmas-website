<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// ---------------- CORS Fix ----------------
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
// ------------------------------------------

header('Content-Type: application/json; charset=utf-8');

// --- your database connection and logic ---
$dbHost = '127.0.0.1';
$dbName = 'christmas_db';
$dbUser = 'root';
$dbPass = '';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    echo json_encode(['ok'=>false,'error'=>'DB connection failed: '.$e->getMessage()]);
    exit;
}
// ------------------------
// Actions
// ------------------------
$action = $_GET['action'] ?? '';

if ($action === 'comments') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("SELECT * FROM comments ORDER BY timestamp DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if(empty($data['id']) || empty($data['text'])) {
            echo json_encode(['ok'=>false,'error'=>'Missing data']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO comments (id, name, text, likes, timestamp) VALUES (:id, :name, :text, :likes, :timestamp)");
        $stmt->execute([
            ':id'=>$data['id'],
            ':name'=>$data['name'] ?? 'Anonymous',
            ':text'=>$data['text'],
            ':likes'=>$data['likes'] ?? 0,
            ':timestamp'=>$data['timestamp'] ?? time()*1000
        ]);

        echo json_encode(['ok'=>true]);
        exit;
    }
}

if($action==='like' && $_SERVER['REQUEST_METHOD']==='POST') {
    $data=json_decode(file_get_contents('php://input'),true);
    if($data['action']==='like'){
        $stmt=$pdo->prepare("UPDATE comments SET likes=likes+1 WHERE id=:id");
    } else {
        $stmt=$pdo->prepare("UPDATE comments SET likes=GREATEST(likes-1,0) WHERE id=:id");
    }
    $stmt->execute([':id'=>$data['id']]);
    echo json_encode(['ok'=>true]);
    exit;
}

echo json_encode(['ok'=>false,'error'=>'Invalid action']);
?>

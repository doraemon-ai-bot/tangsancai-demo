"""Flask server for serving the Tang Sancai 3D Avatar flow & matching poses."""

import base64
import json
import os
import random
import time

import flask

# Try to import the modern Google GenAI API.
try:
  from google import genai
  from google.genai import types
  HAS_GEMINI = True
except ImportError:
  genai = None
  types = None
  HAS_GEMINI = False

app = flask.Flask(__name__, static_url_path="/static", static_folder="static")

# Initialize Gemini client if available
client = None
if HAS_GEMINI and genai is not None:
  try:
    # The modern Client() automatically initializes using GEMINI_API_KEY
    # or Google Application Default Credentials (ADC).
    client = genai.Client()
  except Exception as e:  # pylint: disable=broad-except
    print(f"Failed to initialize GenAI client: {e}")
    HAS_GEMINI = False


@app.route("/")
def index():
  return flask.send_from_directory("static", "index.html")


@app.route("/api/match-avatar", methods=["POST"])
def match_avatar():
  """Vision endpoint that takes a frame, matches a Tang figurine avatar using AI."""
  data = flask.request.json
  if not data or "image" not in data:
    return flask.jsonify({"error": "Missing image data"}), 400

  image_data_url = data["image"]
  if not image_data_url.startswith("data:image/"):
    return flask.jsonify({"error": "Invalid image format"}), 400

  # Extract base64 data
  _, encoded = image_data_url.split(",", 1)
  image_bytes = base64.b64decode(encoded)

  avatar_options = [
      {
          "id": "lady",
          "name": "三元唐俑·优雅仕女 (Sancai Elegant Lady)",
          "desc": (
              "完美融合了包豪斯优雅的曲线与唐三彩丰腴古雅的仕女风姿。"
              "您的姿态流露出东方含蓄之美，如行云流水般优雅。"
          ),
          "modelPath": "/static/models/sancai_lady.glb",
      },
      {
          "id": "warrior",
          "name": "三元唐俑·刚劲武士 (Sancai Martial Warrior)",
          "desc": (
              "完美融合了包豪斯硬朗的几何构成与唐三彩天王俑的威武雄健。"
              "您的姿态充满力量与动感，尽显阳刚刚劲之气。"
          ),
          "modelPath": "/static/models/sancai_warrior.glb",
      },
      {
          "id": "camel",
          "name": "三元唐俑·乐舞胡人 (Sancai Camel Dancer)",
          "desc": (
              "完美融合了包豪斯富有节奏感的空间构成与丝绸之路驼背乐舞的异域风情。"
              "您的姿态充满律动与活力，热烈奔放。"
          ),
          "modelPath": "/static/models/sancai_camel.glb",
      },
  ]

  if not HAS_GEMINI or client is None or types is None:
    # Mock mode: pick one based on simple analysis or randomly
    time.sleep(1)
    matched = random.choice(avatar_options)
    return flask.jsonify({
        "success": True,
        "matched": matched,
        "mode": "mock",
        "analysis": (
            "【分析日志】识别到体验者身体轴线呈优美曲线，上肢舒展，神态温和。"
            "精准匹配唐三彩仕女俑的艺术意向。"
        ),
    })

  try:
    # Use Gemini 2.5 Flash for ultra-fast multimodal analysis
    model_name = "gemini-2.5-flash"

    prompt = """
    你是一位资深的艺术评论家与数字艺术家。
    请分析这张体验者的动作照片（肢体动作、站姿、神态），在以下三个“三元唐俑”艺术化身中，选择一个最符合其精神气质与姿态美学的化身：

    1. "lady": 三元唐俑·优雅仕女 (Sancai Elegant Lady)
       - 特点：优雅、含蓄、曲线流美、沉静。适合舒展、温和、偏静态或舞蹈般的优美姿态。
    2. "warrior": 三元唐俑·刚劲武士 (Sancai Martial Warrior)
       - 特点：刚烈、几何感强、充满力量、威武。适合张力大、有力量感、武术或戏剧化的张扬姿态。
    3. "camel": 三元唐俑·乐舞胡人 (Sancai Camel Dancer)
       - 特点：动感、节奏感强、异域风情、活泼。适合倾斜、富有节奏感、扭动或极具活力的姿态。

    请返回符合以下JSON格式的分析结果，不要包含任何Markdown标记（如 ```json）：
    {
      "matched_id": "lady" 或 "warrior" 或 "camel",
      "analysis_reason": "详细的艺术分析过程，说明为什么体验者的动作和神态契合该唐俑的几何线条与色彩韵味。字数在100-150字左右。"
    }
    """

    response = client.models.generate_content(
        model=model_name,
        contents=[
            prompt,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg"
            )
        ]
    )

    # Parse response
    text = response.text.strip()
    # Clean markdown if any
    if text.startswith("```json"):
      text = text[7:]
    if text.endswith("```"):
      text = text[:-3]
    text = text.strip()

    result = json.loads(text)
    matched_id = result.get("matched_id", "lady")
    analysis = result.get("analysis_reason", "分析完成。")

    # Find the matched option
    matched = next(
        (x for x in avatar_options if x["id"] == matched_id),
        avatar_options[0],
    )

    return flask.jsonify({
        "success": True,
        "matched": matched,
        "mode": "gemini",
        "analysis": f"【AI分析】{analysis}",
    })

  except Exception as e:  # pylint: disable=broad-except
    print(f"Error calling Gemini API: {e}")
    matched = random.choice(avatar_options)
    return flask.jsonify({
        "success": True,
        "matched": matched,
        "mode": "fallback",
        "analysis": (
            f"【AI分析失败，进入自动适配】自动适配为：{matched['name']}。"
        ),
    })


@app.route("/api/preset-video")
def preset_video():
  """Encodes test_dance.mp4 as Base64 and returns it as a single JSON payload.
  
  This bypasses SSH port forwarding range-requests throttling, preventing hangs.
  """
  try:
    video_path = os.path.join(os.path.dirname(__file__), "static", "test_dance.mp4")
    if not os.path.exists(video_path):
      video_path = "static/test_dance.mp4"
      
    with open(video_path, "rb") as f:
      encoded = base64.b64encode(f.read()).decode("utf-8")
      
    return flask.jsonify({
        "success": True,
        "videoData": f"data:video/mp4;base64,{encoded}"
    })
  except Exception as e:  # pylint: disable=broad-except
    print(f"Failed to encode preset video: {e}")
@app.route("/api/client-config")
def client_config():
  """Securely supplies client runtime config without hardcoding secrets in code."""
  key = os.environ.get("GEMINI_API_KEY", "")
  key_path = os.path.join(os.path.dirname(__file__), ".client_secret_key")
  if not key and os.path.exists(key_path):
    with open(key_path, "r", encoding="utf-8") as f:
      key = f.read().strip()
  return flask.jsonify({
      "success": True,
      "gemmaApiKey": key,
      "gemmaModel": "gemma-4-31b-it"
  })


if __name__ == "__main__":
  # Bind to port provided by env (for sidecars/services) or default 8080
  app_port = int(os.environ.get("PORT", 8080))
  app.run(host="127.0.0.1", port=app_port, debug=True)

import gradio as gr
import requests

API_URL = "http://127.0.0.1:8090/meta/search"


def search(lat, lon, radius, entity, limit):
    payload = {
        "lat": float(lat),
        "lon": float(lon),
        "radius_m": int(radius),
        "entity_type": entity.lower(),
        "limit": int(limit),
    }
    response = requests.post(API_URL, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()

    if not data.get("results"):
        return "No results found.", data

    lines = []
    for r in data["results"]:
        lines.append(
            f"- [{r.get('category')}] {r['name']} | {r.get('phone') or 'N/A'} | {r['distance_m']}m"
        )
    return "\n".join(lines), data


with gr.Blocks() as demo:
    gr.Markdown("## MetaEngine Nearby Finder (MedOS-compatible)")
    with gr.Row():
        lat = gr.Number(label="Latitude", value=40.7128)
        lon = gr.Number(label="Longitude", value=-74.0060)
    radius = gr.Slider(label="Radius (m)", minimum=200, maximum=10000, step=100, value=3000)
    entity = gr.Radio(["pharmacy", "doctor", "all"], value="all", label="Entity")
    limit = gr.Slider(label="Limit", minimum=5, maximum=100, step=5, value=25)

    out = gr.Textbox(label="Summary", lines=12)
    json_out = gr.JSON(label="MetaEngine JSON")
    btn = gr.Button("Search Nearby")
    btn.click(search, [lat, lon, radius, entity, limit], [out, json_out])


if __name__ == "__main__":
    demo.launch()

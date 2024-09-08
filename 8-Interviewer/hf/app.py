import gradio as gr
import tempfile
import os
from pathlib import Path
from io import BytesIO
from settings import (
    respond,
    generate_random_string,
    reset_interview,
    generate_interview_report,
    generate_report_from_file,
    interview_history,
    question_count,
    language,
)
from ai_config import convert_text_to_speech, transcribe_audio, n_of_questions
from prompt_instructions import get_interview_initial_message_sarah, get_interview_initial_message_aaron

# Global variables
temp_audio_files = []
initial_audio_path = None
selected_interviewer = "Sarah"
audio_enabled = True

def reset_interview_action(voice):
    global question_count, interview_history, selected_interviewer
    selected_interviewer = voice
    question_count = 0
    interview_history.clear()

    if voice == "Sarah":
        initial_message = get_interview_initial_message_sarah()
        voice_setting = "alloy"
    else:
        initial_message = get_interview_initial_message_aaron()
        voice_setting = "onyx"

    initial_message = str(initial_message)

    initial_audio_buffer = BytesIO()
    convert_text_to_speech(initial_message, initial_audio_buffer, voice_setting)
    initial_audio_buffer.seek(0)

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
        temp_audio_path = temp_file.name
        temp_file.write(initial_audio_buffer.getvalue())

    temp_audio_files.append(temp_audio_path)

    return (
        [(None, initial_message[0] if isinstance(initial_message, tuple) else initial_message)],
        gr.Audio(value=temp_audio_path, label=voice, autoplay=True, visible=False),
        gr.Textbox(value="")
    )

def create_app():
    global initial_audio_path, selected_interviewer, audio_enabled
    # Initialize without any message history
    initial_message = ""

    with gr.Blocks(title="AI Medical Interviewer") as demo:
        gr.Image(value="appendix/icon.jpeg", label='icon', width=20, scale=1, show_label=False, show_fullscreen_button=False,
                 show_download_button=False, show_share_button=False)
        gr.Markdown(
            """
            # Medical Interviewer
            This chatbot conducts medical interviews based on medical knowledge.
            The interviewer will prepare a medical report based on the interview.
            """
        )

        with gr.Tab("Interview"):
            with gr.Row():
                reset_button = gr.Button("Start Interview", size='sm', scale=1)
                end_button = gr.Button("End Interview", size='sm', scale=1)  # Added End Interview button
                audio_output = gr.Audio(
                    label="Sarah",
                    scale=3,
                    autoplay=True,
                    visible=False,  # Hides the audio but keeps it active
                    show_download_button=False,
                )

            # Chatbot initialized with no messages
            chatbot = gr.Chatbot(value=[], label=f"Medical Interview📋")
            with gr.Row():
                msg = gr.Textbox(label="Type your message here...", scale=3)
                audio_input = gr.Audio(sources=(["microphone"]), label="Record your message", type="filepath", scale=1)
            send_button = gr.Button("Send")
            pdf_output = gr.File(label="Download Report", visible=False)

            def user(user_message, audio, history):
                if audio is not None:
                    user_message = transcribe_audio(audio)
                return "", None, history + [[user_message, None]]

            def bot_response(chatbot, message):
                global question_count, temp_audio_files, selected_interviewer, audio_enabled
                question_count += 1

                last_user_message = chatbot[-1][0] if chatbot else message

                voice = "alloy" if selected_interviewer == "Sarah" else "onyx"
                response, audio_buffer = respond(chatbot, last_user_message, voice, selected_interviewer)

                for bot_message in response:
                    chatbot.append((None, bot_message[1]))

                if isinstance(audio_buffer, BytesIO):
                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                        temp_audio_path = temp_file.name
                        temp_file.write(audio_buffer.getvalue())
                    temp_audio_files.append(temp_audio_path)
                    audio_output = gr.Audio(value=temp_audio_path, label=selected_interviewer, autoplay=audio_enabled, visible=False)
                else:
                    audio_output = gr.Audio(value=audio_buffer, label=selected_interviewer, autoplay=audio_enabled, visible=False)

                if question_count >= n_of_questions():
                    conclusion_message = "Thank you for participating in this interview. We have reached the end of our session. I hope this conversation has been helpful. Take care!"
                    chatbot.append((None, conclusion_message))

                    conclusion_audio_buffer = BytesIO()
                    convert_text_to_speech(conclusion_message, conclusion_audio_buffer, voice)
                    conclusion_audio_buffer.seek(0)

                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                        temp_audio_path = temp_file.name
                        temp_file.write(conclusion_audio_buffer.getvalue())
                    temp_audio_files.append(temp_audio_path)
                    audio_output = gr.Audio(value=temp_audio_path, label=selected_interviewer, autoplay=audio_enabled, visible=False)

                    report_content, pdf_path = generate_interview_report(interview_history, language)
                    chatbot.append((None, f"Interview Report:\n\n{report_content}"))

                    return chatbot, audio_output, gr.File(visible=True, value=pdf_path)

                return chatbot, audio_output, gr.File(visible=False)

            # Function to reset and start the interview, which populates the chatbot with the initial message
            def start_interview():
                global selected_interviewer
                return reset_interview_action(selected_interviewer)

            # Function to end the interview
            def end_interview(chatbot):
                chatbot.append((None, "The interview has been ended by the user."))
                return chatbot, gr.Audio(visible=False), gr.Textbox(value="")

            # Bind actions to buttons
            reset_button.click(
                start_interview,
                inputs=[],
                outputs=[chatbot, audio_output, msg]
            )

            end_button.click(
                end_interview,
                inputs=[chatbot],
                outputs=[chatbot, audio_output, msg]
            )

            msg.submit(user, [msg, audio_input, chatbot], [msg, audio_input, chatbot], queue=False).then(
                bot_response, [chatbot, msg], [chatbot, audio_output, pdf_output]
            )

            send_button.click(user, [msg, audio_input, chatbot], [msg, audio_input, chatbot], queue=False).then(
                bot_response, [chatbot, msg], [chatbot, audio_output, pdf_output]
            )

        with gr.Tab("Settings"):
            gr.Markdown('Configure your settings below:')
            audio_toggle = gr.Checkbox(label="Enable Audio", value=True)
            interviewer_radio = gr.Radio(["Sarah", "Aaron"], label="Select Interviewer", value="Sarah")

            def update_settings(audio_status, interviewer_choice):
                global audio_enabled, selected_interviewer
                audio_enabled = audio_status
                selected_interviewer = interviewer_choice
                return f"Settings updated: Audio {'Enabled' if audio_enabled else 'Disabled'}, Interviewer: {selected_interviewer}"

            settings_button = gr.Button("Apply Settings")
            settings_message = gr.Textbox(visible=True)

            settings_button.click(
                update_settings,
                inputs=[audio_toggle, interviewer_radio],
                outputs=[settings_message]
            )

        with gr.Tab("Upload Document"):
            gr.Markdown('Please upload a document that contains content written about a patient or by the patient.')
            file_input = gr.File(label="Upload a TXT, PDF, or DOCX file")
            language_input = 'English'
            generate_button = gr.Button("Generate Report")
            report_output = gr.Textbox(label="Generated Report", lines=100, visible=False)
            pdf_output = gr.File(label="Download Report", visible=True)

            def generate_report_and_pdf(file, language):
                report_content, pdf_path = generate_report_from_file(file, language)
                return report_content, pdf_path, gr.File(visible=True)

            generate_button.click(
                generate_report_and_pdf,
                inputs=[file_input],
                outputs=[report_output, pdf_output, pdf_output]
            )

        with gr.Tab("Description"):
            with open('appendix/description.txt', 'r', encoding='utf-8') as file:
                description_txt = file.read()
            gr.Markdown(description_txt)
            gr.Image(value="appendix/diagram.png", label='diagram', width=700, scale=1, show_label=False)

    return demo

# Clean up function
def cleanup():
    global temp_audio_files, initial_audio_path
    for audio_file in temp_audio_files:
        if os.path.exists(audio_file):
            os.unlink(audio_file)
    temp_audio_files.clear()

    if initial_audio_path and os.path.exists(initial_audio_path):
        os.unlink(initial_audio_path)

if __name__ == "__main__":
    app = create_app()
    try:
        app.launch()
    finally:
        cleanup()

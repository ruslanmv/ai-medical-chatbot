FROM python:3.11-slim
WORKDIR /app
COPY 12-deploy/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY . /app
CMD ["uvicorn", "06-api.main:app", "--host", "0.0.0.0", "--port", "8090"]

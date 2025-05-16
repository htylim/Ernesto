FROM python:3.9-slim

COPY . ./app
WORKDIR /app
RUN pip3 install --no-cache-dir -r requirements.txt

CMD ["python3", "run.py", "--host=0.0.0.0", = "--port=8080"] 

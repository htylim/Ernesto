FROM python:3.9-slim

COPY . ./app
WORKDIR /app
RUN apt-get update && apt-get install -y locales && \
    sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
RUN apt-get update && apt-get install -y postgresql-client
RUN pip3 install --no-cache-dir -r requirements.txt
RUN pip3 install pre-commit

CMD ["flask", "run", "--host=0.0.0.0", "--port=8080"] 

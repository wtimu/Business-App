@echo off
echo Generating SSL certificate for HTTPS...
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=UG/ST=Central/L=Kampala/O=Adtim/CN=localhost"
echo SSL certificate generated successfully!
pause
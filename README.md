<p align="center" style="color: #343a40">
  <img src="https://raw.githubusercontent.com/Woong25/colorchat/main/public/assets/images/favicon.png" />
  <h1 align="center">Color Chat</h1>
</p>
<p align="center" style="font-size: 1.2rem;">Anonymous chat using sockets.</p>

# 👀 Demo
<img src="https://raw.githubusercontent.com/Woong25/colorchat/main/demo1.png" width="49.5%" /> <img src="https://raw.githubusercontent.com/Woong25/colorchat/main/demo2.png" width="49.5%" />
<img src="https://raw.githubusercontent.com/Woong25/colorchat/main/demo3.png" width="49.5%" /> <img src="https://raw.githubusercontent.com/Woong25/colorchat/main/demo3-1.png" width="49.5%" />
<img src="https://raw.githubusercontent.com/Woong25/colorchat/main/demo4.png" width="49.5%" />

# 📖 Docs

### Quick Start

1. Clone repo
```bash
#HTTPS
https://github.com/Woong25/colorchat.git

#SSH
git@github.com:Woong25/colorchat.git 
```

2. Install packages (db version v3.6.19)
   
```json
"dependencies": {
    "axios": "^0.20.0",
    "color-hash": "^1.0.3",
    "connect-flash": "^0.1.1",
    "cookie-parser": "^1.4.5",
    "cookie-signature": "^1.1.0",
    "dotenv": "^8.2.0",
    "ejs": "^3.1.5",
    "express": "^4.17.1",
    "express-session": "^1.17.1",
    "moment": "^2.29.0",
    "mongoose": "^5.10.7",
    "morgan": "^1.10.0",
    "multer": "^1.4.2",
    "pug": "^3.0.0",
    "socket.io": "^2.3.0",
    "ws": "^7.3.1"
 },
```
3. .env file setting
```bash
# .env
PORT=8080
COOKIE_SECRET=colorchat
SOCKET_HOST=http://xx.xx.xx.xxx:8080 or https://localhost:8080
```

4. run
```bash
npm start
```

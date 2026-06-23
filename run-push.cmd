@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "c:\Users\Tapanawat\Desktop\prj ube\sales-forecast-01"
node_modules\.bin\prisma.cmd db push

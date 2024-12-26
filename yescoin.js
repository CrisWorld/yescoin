const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class YescoinClient {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Origin": "https://www.yescoin.gold",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.tokens = [];
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch (type) {
            case 'success':
                console.log(`[${timestamp}] [✓] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;
            case 'error':
                console.log(`[${timestamp}] [✗] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [!] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [ℹ] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i > 0; i--) {
            const timestamp = new Date().toLocaleTimeString();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[${timestamp}] [*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
    }

    async login(initData) {
        const url = "https://bi.yescoin.gold/user/login";

        try {
            const headers = {
                ...this.headers,
                "Content-Type": "application/json"
            };

            const payload = {
                code: initData
            };

            const response = await axios.post(url, payload, { headers });

            if (response.status === 200) {
                const token = response.data.data.token;

                if (token) {
                    this.log(`Login thành công.`, 'success');
                    return token;
                } else {
                    this.log('Không tìm thấy Cookie ID trong phản hồi', 'error');
                    return null;
                }
            } else {
                this.log(`Đăng nhập không thành công: ${response.status}`, 'error');
                return null;
            }
        } catch (error) {
            this.log(`Lỗi đăng nhập: ${error.message}`, 'error');
            return null;
        }
    }

    async fetchUserProfile(token) {
        const url = "https://bi.yescoin.gold/account/getAccountInfo";

        try {
            const headers = {
                ...this.headers,
                "Token": token
            };

            const response = await axios.get(url, { headers });

            if (response.status === 200) {
                const profileData = response.data;
                this.log(`Yescoin: ${profileData.data.currentAmount}`, 'custom');
                this.log(`Level: ${profileData.data.levelInfo.level}`, 'custom');

                return profileData;
            } else {
                this.log(`Không thể lấy thông tin profile: ${response.status}`, 'error');
                return null;
            }
        } catch (error) {
            this.log(`Lỗi khi gọi API: ${error.message}`, 'error');
            return null;
        }
    }

    async fetchDailyMissions(token) {
        const url = "https://bi.yescoin.gold/mission/getDailyMission";

        try {
            const headers = {
                ...this.headers,
                "Token": token
            };

            const response = await axios.get(url, { headers });

            if (response.status === 200) {
                const pendingMissions = response.data.data.filter(
                    mission => mission.missionStatus == 0
                );

                this.log(`Tìm thấy ${pendingMissions.length.toString()} nhiệm vụ chưa hoàn thành`, 'info');

                return pendingMissions;
            } else {
                this.log(`Không thể lấy danh sách nhiệm vụ: ${response.status}`, 'error');
                return [];
            }
        } catch (error) {
            this.log(`Lỗi khi lấy danh sách nhiệm vụ: ${error.message}`, 'error');
            return [];
        }
    }

    async fetchTaskList(token) {
        const url = `https://bi.yescoin.gold/task/getTaskList`;

        try {
            const headers = {
                ...this.headers,
                "Token": token
            };

            const response = await axios.get(url, { headers });

            if (response.status === 200) {
                const taskList = response.data.data.specialTaskList.filter((task) => task.taskStatus === 0);
                return taskList;
            } else {
                this.log(`Không thể lấy danh sách task: ${response.status}`, 'error');
                return [];
            }
        } catch (error) {
            this.log(`Lỗi khi lấy danh sách task: ${error.message}`, 'error');
            return [];
        }

    }

    async checkDailyMission(token, mission) {
        const url = `https://bi.yescoin.gold/mission/checkDailyMission`;
        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };

            const payload = mission.missionId;

            const response = await axios.post(url, payload, { headers });

            if (response.status === 200 && response.data.code === 0) {
                this.log(`Check nhiệm vụ ${mission.name}`, 'info');
                return true;
            } else {
                this.log(`Không thể check nhiệm vụ ${mission.name}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`Lỗi khi hoàn thành nhiệm vụ ${mission.name}: ${error.message}`, 'error');
            return false;
        }

    }

    async checkTask(token, task) {
        const url = `https://bi.yescoin.gold/task/checkTask`;

        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };

            const payload = task.taskId;

            const response = await axios.post(url, payload, { headers });

            if (response.status === 200 && response.data.code === 0) {
                this.log(`Check nhiệm vụ ${task.taskName}`, 'info');
                return true;
            } else {
                this.log(`Không thể check nhiệm vụ ${task.taskName}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`Lỗi khi hoàn thành nhiệm vụ ${task.taskName}: ${error.message}`, 'error');
            return false;
        }
    }

    async completeTask(token, task) {
        const url = `https://bi.yescoin.gold/task/claimTaskReward`;


        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };

            const payload = task.taskId;
            let retries = 3;
            let count = 0;
            while (count < retries) {
                const response = await axios.post(url, payload, { headers });

                if (response.status === 200 && response.data.code === 0) {
                    this.log(`Làm nhiệm vụ ${task.taskName} thành công`, 'success');
                    return true;
                } else {
                    count++;
                    this.log(`Không thể hoàn thành nhiệm vụ ${task.taskName} | Thử lại lần ${count}`, 'error');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            this.log(`Không thể hoàn thành nhiệm vụ ${task.taskName}`, 'error');
            return false;
        } catch (error) {
            this.log(`Lỗi khi hoàn thành nhiệm vụ ${task.taskName}: ${error.message}`, 'error');
            return false;
        }
    }


    async completeMission(token, mission) {
        const url = "https://bi.yescoin.gold/mission/claimReward";

        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };

            const payload = mission.missionId;
            let retries = 3;
            let count = 0;
            while (count < retries) {
                const response = await axios.post(url, payload, { headers });

                if (response.status === 200 && response.data.code === 0) {
                    this.log(`Làm nhiệm vụ ${mission.name} thành công`, 'success');
                    return true;
                } else {
                    count++;
                    this.log(`Không thể hoàn thành nhiệm vụ ${mission.name} | Thử lại lần ${count}`, 'error');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            this.log(`Không thể hoàn thành nhiệm vụ ${mission.name}`, 'error');
            return false;
        } catch (error) {
            this.log(`Lỗi khi hoàn thành nhiệm vụ ${mission.name}: ${error.message}`, 'error');
            return false;
        }
    }

    async processMissions(token) {
        const pendingMissions = await this.fetchDailyMissions(token);

        for (const mission of pendingMissions) {
            const ok = await this.checkDailyMission(token, mission);
            if (!ok) {
                continue;
            }
            await this.completeMission(token, mission);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async processTasks(token) {
        const pendingTasks = await this.fetchTaskList(token);

        for (const task of pendingTasks) {
            let ok = true;
            if (task.checkStatus == 0) ok = await this.checkTask(token, task);
            if (!ok) continue;
            await this.completeTask(token, task);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // async checkIn(token, checkin) {
    //     const url = `https://bi.yescoin.gold/signIn/claim`;
    // }

    // async findCheckin(token) {
    //     const url = "https://bi.yescoin.gold/signIn/list";

    //     try {
    //         const headers = {
    //             ...this.headers,
    //             "Token": token
    //         };

    //         const response = await axios.get(url, { headers });

    //         if (response.status === 200) {
    //             const checkinList = response.data.data;
    //             for (const checkin of checkinList) {
    //                 if (checkin.checkIn === 0) {
    //                     return checkin;
    //                 }
    //             }
    //         } else {
    //             this.log(`Không thể check-in: ${response.status} hoặc bạn đã checkin rồi`, 'error');
    //             return null;
    //         }
    //     } catch (error) {
    //         this.log(`Lỗi khi check-in: ${error.message}`, 'error');
    //         return null;
    //     }
    // }

    async collectCoin(token) {
        const url = `https://bi.yescoin.gold/game/collectCoin`;

        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };

            const response = await axios.post(url, "200", { headers });

            if (response.status == 200 && response.data.code === 0) {
                const coin = response.data.data.collectAmount;
                this.log(`Nhận ${coin} coin thành công`, 'success');
                return coin;
            } else {
                this.log(`Không thể nhận coin: ${response.data.message}`, 'error');
                return 0;
            }
        } catch (error) {
            this.log(`Lỗi khi nhận coin: ${error.message}`, 'error');
            return 0;
        }
    }

    async getSpecialBox(token) {
        const url = `https://bi.yescoin.gold/game/getSpecialBoxInfo`;

        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };

            const response = await axios.get(url, { headers });

            if (response.status == 200 && response.data.code === 0) {
                const box = response.data.data.autoBox;
                if (box.boxStatus) this.log(`Tìm thấy 1 special box`, 'info');
                else this.log("Không có special box");
                return box;
            } else {
                this.log(`Không thể nhận coin: ${response.data.message}`, 'error');
                return null;
            }
        } catch (error) {
            this.log("Có lỗi xảy ra khi get special box", "error");
            return null;
        }
    }

    async collectSpecialBox(token, box) {
        if (!box?.boxStatus) return;
        const url = `https://bi.yescoin.gold/game/collectSpecialBoxCoin`;

        try {
            const headers = {
                ...this.headers,
                "Token": token,
                "Content-Type": "application/json"
            };
            const payload = {
                "boxType": box.boxType,
                "coinCount": box.specialBoxTotalCount
            }
            const response = await axios.get(url, payload, { headers });

            if (response.status == 200 && response.data.code === 0) {
                const coin = response.data.data.collectAmount;
                this.log(`Nhận được ${coin} từ box`);
                return 1;
            } else {
                this.log(`Không thể nhận coin từ box: ${response.data.message}`, 'error');
                return 0;
            }
        } catch (error) {
            this.log("Có lỗi xảy ra", "error");
            return 0;
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const initDatas = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        while (true) {
            for (let i = 0; i < initDatas.length; i++) {
                const initData = decodeURIComponent(initDatas[i]);
                this.log(`========== Tài khoản ${(i + 1).toString()} ==========`, 'custom');

                const token = await this.login(initData);

                if (token) {
                    let count = -1;
                    while (true) {
                        count++;
                        count = count % 10000000;
                        if (count % 15 == 0) {
                            const profileData = await this.fetchUserProfile(token);
                            await this.processMissions(token);
                            await this.processTasks(token);
                            const box = await this.getSpecialBox(token);
                            if (box) await this.collectSpecialBox(token, box)
                        }
                        await this.collectCoin(token);
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                } else {
                    this.log(`Bỏ qua tài khoản ${i + 1} do lỗi đăng nhập`, 'warning');
                }
            }
            await this.countdown(60 * 60);
        }
    }
}

const client = new YescoinClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
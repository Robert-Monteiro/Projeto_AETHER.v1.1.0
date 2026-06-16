#!/usr/bin/env python3
"""
AETHER Inventory Agent
Automates asset discovery and inventory management
"""

import requests
import json
import socket
import platform
import psutil
import subprocess
import sys
from datetime import datetime
import logging
import winreg
from flask import Flask, jsonify

# Configure logging
logging.basicConfig(
    filename='inventory_agent.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class InventoryAgent:
    def __init__(self, api_url='http://localhost:5000/api', api_key=None):
        self.api_url = api_url
        self.api_key = api_key
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}' if api_key else ''
        }

    def get_system_info(self):
        """Collect basic system information"""
        try:
            info = {
                'hostname': socket.gethostname(),
                'os': platform.system(),
                'os_version': platform.version(),
                'architecture': platform.machine(),
                'processor': platform.processor(),
                'cpu_count': psutil.cpu_count(),
                'memory_total': psutil.virtual_memory().total,
                'disks': []
            }

            # Get disk information
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    info['disks'].append({
                        'device': partition.device,
                        'mountpoint': partition.mountpoint,
                        'total': usage.total,
                        'used': usage.used,
                        'free': usage.free
                    })
                except:
                    pass

            return info
        except Exception as e:
            logging.error(f"Error collecting system info: {e}")
            return None

    def get_installed_software(self):
        """Get list of installed software (Windows/Linux)"""
        software = []
        try:
            if platform.system() == 'Windows':
                # Windows: Use PowerShell to get installed programs
                cmd = 'powershell "Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | Format-List"'
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.returncode == 0:
                    # Parse output (simplified)
                    lines = result.stdout.split('\n')
                    current_app = {}
                    for line in lines:
                        if line.strip():
                            if ':' in line:
                                key, value = line.split(':', 1)
                                key = key.strip()
                                value = value.strip()
                                if key == 'DisplayName':
                                    if current_app:
                                        software.append(current_app)
                                    current_app = {'name': value}
                                elif key == 'DisplayVersion' and current_app:
                                    current_app['version'] = value
                                elif key == 'Publisher' and current_app:
                                    current_app['publisher'] = value
                    if current_app:
                        software.append(current_app)

            elif platform.system() == 'Linux':
                # Linux: Check common package managers
                try:
                    result = subprocess.run(['dpkg', '--list'], capture_output=True, text=True)
                    if result.returncode == 0:
                        lines = result.stdout.split('\n')[5:]  # Skip header
                        for line in lines:
                            if line.startswith('ii'):
                                parts = line.split()
                                if len(parts) >= 3:
                                    software.append({
                                        'name': parts[1],
                                        'version': parts[2],
                                        'publisher': 'Debian/Ubuntu'
                                    })
                except:
                    pass

        except Exception as e:
            logging.error(f"Error collecting software info: {e}")

        return software

    def discover_network_devices(self):
        """Discover network devices (simplified ping sweep)"""
        devices = []
        try:
            # Get local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()

            # Simple ping sweep (first 10 IPs in subnet)
            base_ip = '.'.join(local_ip.split('.')[:-1]) + '.'

            for i in range(1, 11):
                ip = base_ip + str(i)
                try:
                    result = subprocess.run(['ping', '-c', '1', '-W', '1', ip],
                                          capture_output=True, text=True)
                    if result.returncode == 0:
                        devices.append({
                            'ip': ip,
                            'status': 'online',
                            'discovered_at': datetime.now().isoformat()
                        })
                except:
                    pass

        except Exception as e:
            logging.error(f"Error discovering network devices: {e}")

        return devices

    def send_inventory_data(self, data):
        """Send collected data to the device API endpoint"""
        try:
            response = requests.post(f"{self.api_url}/devices",
                                     json=data, headers=self.headers)
            if response.status_code in (200, 201):
                logging.info("Inventory data sent successfully")
                return True
            else:
                logging.error(f"Failed to send data: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logging.error(f"Error sending inventory data: {e}")
            return False

    def run_inventory_scan(self):
        """Run complete inventory scan"""
        logging.info("Starting inventory scan...")

        anydesk_id = self.get_anydesk_id()
        rustdesk_id = self.get_rustdesk_id()

        inventory_data = {
            'hostname': socket.gethostname(),
            'system_info': self.get_system_info(),
            'installed_software': self.get_installed_software(),
            'network_devices': self.discover_network_devices(),
            'remote_access': {
                'anydesk': anydesk_id if anydesk_id else 'Não detectado',
                'rustdesk': rustdesk_id if rustdesk_id else 'Não detectado'
            },
            'scan_timestamp': datetime.now().isoformat()
        }

        # Send to API
        success = self.send_inventory_data(inventory_data)

        if success:
            print("Inventory scan completed successfully")
        else:
            print("Inventory scan failed")

        return success

    def get_anydesk_id(self):
        """Retrieve the AnyDesk ID from the Windows Registry."""
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\AnyDesk")
            value, _ = winreg.QueryValueEx(key, "ad.anynet.id")
            winreg.CloseKey(key)
            return value
        except FileNotFoundError:
            return None
        except Exception as e:
            logging.error(f"Error retrieving AnyDesk ID: {e}")
            return None

    def get_rustdesk_id(self):
        """Retrieve the RustDesk ID from configuration files or Registry."""
        try:
            import os
            
            # Try Windows Registry first
            registry_paths = [
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\RustDesk"),
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Wow6432Node\RustDesk"),
                (winreg.HKEY_CURRENT_USER, r"SOFTWARE\RustDesk")
            ]
            
            for hive, path in registry_paths:
                try:
                    key = winreg.OpenKey(hive, path)
                    value, _ = winreg.QueryValueEx(key, "id")
                    winreg.CloseKey(key)
                    if value:
                        return value
                except:
                    pass
            
            # If not found in registry, search in configuration files
            import os.path
            config_paths = [
                os.path.expanduser(r"~\AppData\Roaming\RustDesk\config\rustdesk.toml"),
                os.path.expanduser(r"~\AppData\Roaming\RustDesk\rustdesk.toml"),
                os.path.expanduser(r"~\AppData\Roaming\RustDesk\config\service.toml"),
                os.path.expandvars(r"%ProgramData%\RustDesk\config\rustdesk.toml"),
                os.path.expandvars(r"%ProgramData%\RustDesk\rustdesk.toml"),
                r"C:\Program Files\RustDesk\rustdesk.toml",
                r"C:\Program Files (x86)\RustDesk\rustdesk.toml"
            ]
            
            for config_file in config_paths:
                if os.path.exists(config_file):
                    try:
                        with open(config_file, 'r', encoding='utf-8') as f:
                            for line in f:
                                line = line.strip()
                                if line.startswith('id') and '=' in line:
                                    parts = line.split('=', 1)
                                    if len(parts) > 1:
                                        rustdesk_id = parts[1].strip().strip('"\'')
                                        if rustdesk_id:
                                            return rustdesk_id
                    except Exception as e:
                        logging.debug(f"Error reading RustDesk config {config_file}: {e}")
                        continue
            
            return None
        except Exception as e:
            logging.error(f"Error retrieving RustDesk ID: {e}")
            return None

    def get_client_ip(self):
        """Get the public IP address."""
        try:
            response = requests.get('https://api.ipify.org?format=json')
            return response.json().get('ip')
        except Exception as e:
            logging.error(f"Error retrieving IP: {e}")
            return None

def main():
    # Configuration
    api_url = 'http://localhost:5000/api'
    api_key = None  # Should be provided via config or env

    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--help':
            print("AETHER Inventory Agent")
            print("Usage: python inventory_agent.py [api_url] [api_key]")
            sys.exit(0)
        elif len(sys.argv) >= 2:
            api_url = sys.argv[1]
        if len(sys.argv) >= 3:
            api_key = sys.argv[2]

    agent = InventoryAgent(api_url, api_key)

    # Start Flask app for local API
    app = Flask(__name__)

    @app.route('/get-info')
    def get_info():
        ip = agent.get_client_ip()
        anydesk = agent.get_anydesk_id()
        return jsonify({'ip': ip, 'anydesk': anydesk})

    # Run inventory scan
    agent.run_inventory_scan()

    # Start Flask server
    print("Starting local API server on port 5001...")
    app.run(host='127.0.0.1', port=5001, debug=False)

if __name__ == '__main__':
    main()
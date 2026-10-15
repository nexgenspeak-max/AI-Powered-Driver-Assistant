"""Chạy bộ giả lập DynamoDB (moto) sau máy chủ WSGI waitress để giữ kết nối (HTTP/1.1 keep-alive).

moto_server mặc định trả "Connection: close" cho mọi yêu cầu; dưới tải cao điều đó làm cạn cổng tạm
của máy thí nghiệm (TIME_WAIT) và sinh lỗi giả. DynamoDB thật giữ kết nối, nên bản này gần thực tế hơn.
Chạy: uvx --from "moto[server]" --with waitress python moto_keepalive.py 8010
"""
import sys
from moto.server import DomainDispatcherApplication, create_backend_app
from waitress import serve

app = DomainDispatcherApplication(create_backend_app)
serve(app, host="127.0.0.1", port=int(sys.argv[1] if len(sys.argv) > 1 else 8010), threads=16)

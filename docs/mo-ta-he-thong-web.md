# Mô tả hệ thống web quản trị 3M

## 1. Bối cảnh

Hệ thống web được xây dựng để chuyển đổi các file sheet vận hành hiện tại của khách hàng thành một nền tảng quản trị tập trung. Dữ liệu ban đầu đến từ các sheet như `Data`, `Mucluc`, `Donhang`, `Nhaplieu`, `Khach hang`, `Cong no chi tiet`, `TOPA`, `Bangluong2026` và `KPI`.

Mục tiêu không chỉ là đưa dữ liệu từ sheet lên web, mà còn chuẩn hóa lại quy trình quản lý khách hàng, hợp đồng, doanh thu, công nợ, công việc phát sinh, nhân sự, bảng lương, phép và KPI. Hệ thống cần giúp công ty có một nguồn dữ liệu thống nhất, giảm nhập liệu trùng lặp, tự động hóa các khoản doanh thu định kỳ và tạo nền tảng cho báo cáo quản trị.

## 2. Mục tiêu sản phẩm

- Quản lý tập trung thông tin khách hàng, hợp đồng, dịch vụ và nhân sự phụ trách.
- Theo dõi doanh thu định kỳ từ hợp đồng và doanh thu phát sinh ngoài hợp đồng.
- Quản lý công nợ khách hàng, công nợ chi tiết và các khoản liên quan đến đối tác TOPA.
- Quản lý bảng lương, hoa hồng, phụ cấp, bảo hiểm, thuế và khoản thực nhận của nhân sự.
- Quản lý ngày phép, lịch nghỉ và phân quyền theo vai trò nhân viên, trưởng phòng, quản lý.
- Cung cấp dashboard doanh số, công nợ, KPI và hiệu suất theo nhân viên, tháng, khách hàng.
- Cho phép toàn bộ nhân viên xem dữ liệu khách hàng theo phạm vi được phân quyền.

## 3. Phạm vi dữ liệu nguồn

### 3.1. Sheet `Data`: Khách hàng và hợp đồng

Đây là nguồn dữ liệu gốc để quản lý thông tin định danh khách hàng và điều khoản thương mại.

Nhóm thông tin khách hàng:

- Mã khách hàng.
- Tên công ty.
- Tên gọi tắt.
- Mã số thuế.
- Địa chỉ.
- Email.
- Số điện thoại.

Nhóm thông tin đại diện:

- Người đại diện.
- Chức vụ.

Nhóm thông tin kỹ thuật:

- Phần mềm kế toán đang dùng.
- Địa chỉ truy cập phần mềm.

Nhóm thông tin hợp đồng và tài chính:

- Phí dịch vụ hàng tháng.
- Phí hàng quý.
- Thời điểm bắt đầu tính phí.
- Ngày hiệu lực hợp đồng.
- Số năm hiệu lực.
- Ngày chấm dứt hợp đồng.
- Trạng thái hiệu lực.
- Pháp nhân ký hợp đồng hoặc nguồn thu như 3M, TOPA, đối tác khác.
- Nhân sự phụ trách.

### 3.2. Sheet `Mucluc`: Danh mục dịch vụ

Dùng để quản lý các gói dịch vụ công ty cung cấp.

Trường dữ liệu chính:

- Mã dịch vụ.
- Tên dịch vụ.
- Mô tả.
- Đơn giá chuẩn.
- Loại dịch vụ.
- Tình trạng hoạt động.

Trạng thái hoạt động quyết định dịch vụ có được hiển thị khi tạo đơn hàng hoặc công việc phát sinh hay không.

### 3.3. Sheet `Donhang` và `Nhaplieu`: Đơn hàng và doanh thu

Dùng để ghi nhận giao dịch phát sinh thực tế.

Thông tin giao dịch:

- Ngày chứng từ.
- Khách hàng, liên kết theo mã khách hàng.
- Dịch vụ, liên kết theo mã dịch vụ.
- Nhân sự phụ trách.
- Đối tượng nhận hoa hồng.

Thông tin tài chính:

- Số lượng.
- Đơn giá.
- Thành tiền.
- Thuế VAT.
- Tổng tiền phải trả.
- Số tiền đã thanh toán.
- Doanh thu net.

Thông tin phân bổ doanh thu:

- Nguồn thu: 3M, TOPA, cấn trừ hoặc đối tác khác.
- Doanh thu chia sẻ.
- Số tiền phải trả cho đối tác TOPA.

### 3.4. Sheet `Khach hang`, `Cong no chi tiet`, `TOPA`: Công nợ

Dùng để theo dõi dòng tiền và nợ phải thu.

Báo cáo công nợ tổng hợp:

- Nợ đầu kỳ.
- Phát sinh tăng từ đơn hàng hoặc doanh thu mới.
- Phát sinh giảm từ phiếu thu hoặc dữ liệu thanh toán.
- Nợ cuối kỳ.

Sổ chi tiết công nợ:

- Khách hàng.
- Ngày phát sinh.
- Nội dung.
- Số tiền tăng.
- Số tiền giảm.
- Số dư sau phát sinh.

Công nợ đối tác:

- Theo dõi riêng khoản phải trả, thu hộ hoặc cấn trừ liên quan đến TOPA.
- Liên kết với đơn hàng, doanh thu chia sẻ và thanh toán đối tác.

### 3.5. Sheet `Bangluong2026`: Nhân sự và cấu hình lương

Đây là nhóm dữ liệu phức tạp, cần được tách thành thông tin nhân viên, cấu hình lương, công thức tính và bảng lương theo kỳ.

Thông tin nhân viên:

- STT.
- Họ và tên.
- Bậc.
- Phòng ban.
- Loại hợp đồng: fulltime hoặc parttime.
- Hình thức nhận lương: gross hoặc net.

Lương cứng và phụ cấp miễn thuế:

- Lương cơ bản.
- Tiền ăn trưa.
- Trang phục.
- Thưởng sáng kiến hoặc văn phòng xanh.

Cấu hình hoa hồng:

- Hoa hồng vượt doanh số.
- Doanh số tối thiểu, ví dụ 3 lần tổng lương.
- Tỷ lệ thưởng doanh thu vượt, ví dụ 10%.
- Hoa hồng khách lẻ một lần, tỷ lệ 10% đến 30%.
- Hoa hồng khách mới, ví dụ 15% phí tháng đầu.

Phụ cấp khác:

- Hỗ trợ đi lại theo địa điểm như Biên Hòa, TP.HCM, tỉnh.
- Chuyên cần.
- Trách nhiệm.

Các khoản trích theo lương:

- Giảm trừ bản thân.
- Giảm trừ người phụ thuộc.
- Bảo hiểm.
- BHXH doanh nghiệp và người lao động đóng.
- BHYT doanh nghiệp và người lao động đóng.
- BHTN doanh nghiệp và người lao động đóng.
- Kinh phí công đoàn.
- Thuế TNCN.

Kết quả bảng lương:

- Thu nhập chịu thuế.
- Thu nhập tính thuế.
- Thuế TNCN phải nộp.
- Lương thực nhận.
- Tạm ứng.
- Thu nhập chuyển khoản.

### 3.6. Sheet `KPI`: Đánh giá hiệu quả nhân sự

Dùng để đánh giá hiệu quả làm việc và chi phí theo nhân sự.

Chỉ số theo dõi:

- Tổng doanh thu mang về.
- Chi phí lương tương ứng.
- Các khoản phúc lợi đã chi.
- Hoa hồng từ công việc phát sinh một lần.

Chỉ số hiệu suất:

- Tỷ lệ chi phí lương trên doanh thu.
- Doanh thu theo nhân sự.
- Doanh thu theo tháng.
- Doanh thu theo khách hàng.

## 4. Thiết kế lại bài toán nghiệp vụ

### 4.1. Tư duy chuyển đổi số

Hệ thống không nên mô phỏng nguyên trạng từng sheet thành từng màn hình riêng lẻ. Các sheet hiện tại cần được xem như dữ liệu đầu vào để bóc tách thành các thực thể nghiệp vụ rõ ràng.

Nguyên tắc thiết kế:

- Khách hàng, nhân sự, dịch vụ và hợp đồng là dữ liệu danh mục lõi.
- Đơn hàng, công việc phát sinh, thanh toán, công nợ và bảng lương là dữ liệu giao dịch.
- Doanh thu định kỳ phải được sinh tự động từ hợp đồng theo kỳ.
- Doanh thu phát sinh một lần phải được ghi nhận riêng để tính doanh số và hoa hồng.
- Công thức lương, hoa hồng, bảo hiểm và thuế phải được cấu hình hóa, không hard-code theo từng dòng sheet.
- Báo cáo KPI phải lấy từ dữ liệu giao dịch đã chuẩn hóa thay vì nhập tay lại.

### 4.2. Các nhóm người dùng

Nhân viên:

- Xem bảng lương cá nhân.
- Xem ngày phép cá nhân.
- Xem lịch nghỉ toàn công ty.
- Xem dữ liệu khách hàng theo quyền được cấp.
- Ghi nhận hoặc theo dõi công việc phát sinh nếu được phân quyền.

Trưởng phòng:

- Xem tổng ngày phép của team.
- Xem dự án hoặc công việc của team.
- Xem doanh số theo nhân viên trong team.
- Theo dõi hiệu quả và KPI của team.

Quản lý hoặc admin:

- Quản lý toàn bộ khách hàng, hợp đồng, dịch vụ, đơn hàng, công nợ.
- Quản lý bảng lương tổng.
- Quản lý cấu hình lương, hoa hồng, phụ cấp, bảo hiểm, thuế.
- Quản lý phân quyền vai trò.
- Xem toàn bộ dashboard vận hành.

## 5. Các module chức năng đề xuất

### 5.1. Module khách hàng và hợp đồng

Chức năng chính:g thông tin khách hàng, hợp đồng, dịch vụ và nhân sự phụ trách.

- Danh sách khách hàng.
- Tạo, sửa, xem chi tiết khách hàng.
- Quản lý hợp đồng dịch vụ kế toán thuế.
- Theo dõi trạng thái hợp đồng: còn hiệu lực, sắp hết hạn, đã chấm dứt.
- Quản lý giá trị hợp đồng, kỳ hạn, ngày hiệu lực, ngày chấm dứt.
- Gán nhân sự phụ trách khách hàng.
- Ghi nhận pháp nhân ký hợp đồng và nguồn thu.

Yêu cầu quản trị:

- Một khách hàng có thể có nhiều hợp đồng theo thời gian.
- Hợp đồng cần là cơ sở để sinh doanh thu định kỳ hàng tháng hoặc hàng quý.
- Cần cảnh báo hợp đồng sắp hết hạn và khách hàng có công nợ quá hạn.

### 5.2. Module danh mục dịch vụ

Chức năng chính:

- Quản lý mã dịch vụ, tên dịch vụ, mô tả, đơn giá chuẩn và loại dịch vụ.
- Bật hoặc tắt trạng thái hoạt động của dịch vụ.
- Dùng danh mục dịch vụ khi tạo hợp đồng, đơn hàng hoặc công việc phát sinh.

Yêu cầu quản trị:

- Dịch vụ ngưng hoạt động không được chọn khi tạo giao dịch mới.
- Dữ liệu giao dịch cũ vẫn giữ thông tin dịch vụ lịch sử.

### 5.3. Module doanh thu định kỳ

Chức năng chính:

- Tự động sinh doanh thu hằng tháng hoặc hằng quý từ hợp đồng còn hiệu lực.
- Theo dõi kỳ doanh thu, số tiền, VAT, tổng tiền phải thu.
- Gắn doanh thu với khách hàng, hợp đồng, dịch vụ và nhân sự phụ trách.
- Phân biệt rõ doanh thu định kỳ với doanh thu phát sinh một lần.

Yêu cầu quản trị:

- Có thể kiểm tra danh sách doanh thu dự kiến trước khi chốt kỳ.
- Có trạng thái: nháp, đã phát hành, đã thanh toán một phần, đã thanh toán đủ, hủy.
- Doanh thu sau khi chốt phải tạo phát sinh tăng công nợ.

### 5.4. Module công việc phát sinh và doanh số một lần

Chức năng chính:

- Ghi nhận task hoặc job phát sinh ngoài hợp đồng.
- Liên kết công việc với khách hàng, dịch vụ và nhân sự thực hiện.
- Ghi nhận doanh thu thực tế, VAT, tổng tiền, nguồn thu.
- Xác định đối tượng nhận hoa hồng.
- Tổng hợp doanh số theo nhân viên, tháng và khách hàng.

Yêu cầu quản trị:

- Công việc phát sinh là cơ sở tính hoa hồng khách lẻ, khách mới hoặc job một lần.
- Cần phân biệt công việc phát sinh với công việc định kỳ theo hợp đồng.

### 5.5. Module đơn hàng và thanh toán

Chức năng chính:

- Quản lý tất cả giao dịch doanh thu.
- Ghi nhận số tiền đã thanh toán.
- Tính doanh thu net.
- Theo dõi nguồn thu 3M, TOPA, cấn trừ hoặc đối tác khác.
- Theo dõi khoản chia sẻ doanh thu và khoản phải trả cho TOPA.

Yêu cầu quản trị:

- Một giao dịch có thể phát sinh nhiều lần thanh toán.
- Thanh toán làm giảm công nợ khách hàng.
- Phân bổ đối tác cần có dấu vết để đối soát.

### 5.6. Module công nợ

Chức năng chính:

- Báo cáo công nợ tổng hợp theo khách hàng.
- Sổ chi tiết công nợ theo thời gian.
- Theo dõi nợ đầu kỳ, phát sinh tăng, phát sinh giảm, nợ cuối kỳ.
- Cảnh báo công nợ quá hạn.
- Theo dõi công nợ hoặc khoản phải trả liên quan đến TOPA.

Yêu cầu quản trị:

- Công nợ phải được tính từ giao dịch và thanh toán, hạn chế nhập tay số dư cuối kỳ.
- Cho phép điều chỉnh công nợ có lý do và người thực hiện.
- Cần khóa hoặc lưu vết dữ liệu sau khi chốt kỳ.

### 5.7. Module nhân sự, phép và phân quyền

Chức năng chính:

- Quản lý hồ sơ nhân sự.
- Quản lý phòng ban, bậc, loại hợp đồng, hình thức nhận lương.
- Quản lý ngày phép cá nhân.
- Quản lý lịch nghỉ toàn công ty.
- Trưởng phòng xem ngày phép và công việc của team.
- Cấu hình vai trò: cá nhân, nhân viên, trưởng phòng, quản lý, admin.

Yêu cầu quản trị:

- Nhân viên chỉ xem được bảng lương của chính mình.
- Trưởng phòng xem dữ liệu team theo cấu trúc phòng ban.
- Quản lý hoặc admin xem bảng lương tổng và toàn bộ dữ liệu cấu hình.

### 5.8. Module bảng lương và hoa hồng

Chức năng chính:

- Quản lý bảng lương tổng theo tháng.
- Tính lương theo gross hoặc net.
- Tính phụ cấp miễn thuế và phụ cấp khác.
- Tính hoa hồng vượt doanh số.
- Tính hoa hồng khách lẻ, khách mới, job phát sinh một lần.
- Tính bảo hiểm, giảm trừ, thuế TNCN, tạm ứng và thu nhập chuyển khoản.

Yêu cầu quản trị:

- Công thức lương cần tách khỏi giao diện và có thể cấu hình theo chính sách từng năm.
- Bảng lương theo tháng cần lưu snapshot kết quả đã tính để đối chiếu lại.
- Cần có trạng thái bảng lương: nháp, đã kiểm tra, đã chốt, đã thanh toán.

### 5.9. Module KPI và dashboard

Chức năng chính:

- Dashboard doanh số theo nhân viên, tháng, khách hàng.
- Dashboard phân biệt doanh thu định kỳ và doanh thu phát sinh một lần.
- KPI nhân sự theo doanh thu, chi phí lương, phúc lợi, hoa hồng.
- Tỷ lệ chi phí lương trên doanh thu.
- Báo cáo công nợ, nợ quá hạn và dòng tiền.

Yêu cầu quản trị:

- KPI phải lấy từ dữ liệu hợp đồng, giao dịch, thanh toán và bảng lương.
- Dashboard cần có bộ lọc theo thời gian, nhân viên, phòng ban, khách hàng, nguồn thu.

## 6. Quan hệ dữ liệu chính

- Khách hàng 1-n Hợp đồng: một khách hàng có thể có nhiều hợp đồng.
- Khách hàng 1-n Đơn hàng: một khách hàng có nhiều đơn hàng hoặc giao dịch doanh thu.
- Khách hàng 1-n Công nợ chi tiết: một khách hàng có nhiều phát sinh công nợ.
- Hợp đồng 1-n Doanh thu định kỳ: một hợp đồng sinh nhiều kỳ doanh thu.
- Dịch vụ 1-n Hợp đồng chi tiết hoặc đơn hàng: một dịch vụ xuất hiện trong nhiều giao dịch.
- Nhân sự 1-n Khách hàng: một nhân sự phụ trách nhiều khách hàng.
- Nhân sự 1-n Đơn hàng: một nhân sự có thể phụ trách hoặc nhận hoa hồng từ nhiều đơn hàng.
- Nhân sự 1-n Công việc phát sinh: một nhân sự thực hiện nhiều công việc phát sinh.
- Nhân sự 1-n Bảng lương kỳ: mỗi nhân sự có một dòng lương theo từng tháng.
- Phòng ban 1-n Nhân sự: một phòng ban có nhiều nhân sự.
- Đối tác 1-n Giao dịch phân bổ: một đối tác như TOPA có nhiều khoản chia sẻ doanh thu hoặc công nợ.

## 7. Mô hình dữ liệu đề xuất

Các thực thể lõi:

- `customers`: khách hàng.
- `customer_contacts`: người đại diện và thông tin liên hệ.
- `employees`: nhân sự.
- `departments`: phòng ban.
- `services`: danh mục dịch vụ.
- `contracts`: hợp đồng.
- `contract_services`: dịch vụ nằm trong hợp đồng.
- `orders`: giao dịch doanh thu hoặc đơn hàng.
- `one_time_tasks`: công việc phát sinh ngoài hợp đồng.
- `payments`: thanh toán.
- `debt_entries`: sổ chi tiết công nợ.
- `partners`: đối tác như TOPA.
- `partner_settlements`: khoản phải trả, thu hộ, cấn trừ với đối tác.
- `payroll_policies`: cấu hình lương, thuế, bảo hiểm, hoa hồng.
- `payroll_periods`: kỳ lương.
- `payroll_lines`: dòng lương theo nhân sự trong từng kỳ.
- `leave_requests`: đơn nghỉ phép.
- `company_holidays`: lịch nghỉ toàn công ty.
- `roles` và `permissions`: phân quyền hệ thống.

## 8. Luồng nghiệp vụ chính

### 8.1. Luồng nhập dữ liệu ban đầu từ sheet

1. Import khách hàng, hợp đồng, dịch vụ, nhân sự từ các sheet hiện tại.
2. Chuẩn hóa mã khách hàng, mã dịch vụ, tên nhân sự và nguồn thu.
3. Kiểm tra dữ liệu trùng, thiếu mã, sai định dạng ngày, sai số tiền.
4. Tạo dữ liệu danh mục trước, sau đó import giao dịch, công nợ và bảng lương.
5. Lưu lại log import và danh sách dòng lỗi để người dùng sửa.

### 8.2. Luồng doanh thu định kỳ

1. Admin cấu hình hợp đồng và kỳ thu phí.
2. Hệ thống quét hợp đồng còn hiệu lực trong kỳ.
3. Hệ thống tạo doanh thu dự kiến.
4. Kế toán hoặc quản lý kiểm tra và chốt doanh thu.
5. Khi chốt, hệ thống tạo phát sinh tăng công nợ.
6. Khi có thanh toán, hệ thống ghi nhận payment và tạo phát sinh giảm công nợ.

### 8.3. Luồng công việc phát sinh

1. Nhân viên hoặc trưởng phòng tạo task phát sinh ngoài hợp đồng.
2. Chọn khách hàng, dịch vụ, nhân sự thực hiện, nguồn thu và giá trị.
3. Quản lý xác nhận nếu cần.
4. Hệ thống ghi nhận doanh thu một lần.
5. Giao dịch được đưa vào dashboard doanh số và công thức hoa hồng.

### 8.4. Luồng bảng lương

1. Admin tạo kỳ lương tháng.
2. Hệ thống lấy lương cứng, phụ cấp và cấu hình chính sách.
3. Hệ thống tổng hợp doanh số và hoa hồng từ đơn hàng/công việc phát sinh.
4. Hệ thống tính bảo hiểm, giảm trừ, thuế TNCN và lương thực nhận.
5. Người có quyền kiểm tra và chốt bảng lương.
6. Nhân viên chỉ xem được phiếu lương cá nhân sau khi bảng lương được công bố.

## 9. Phân quyền đề xuất

Nhân viên:

- Xem hồ sơ cá nhân.
- Xem bảng lương cá nhân.
- Xem ngày phép cá nhân và lịch nghỉ công ty.
- Xem danh sách khách hàng theo chính sách công ty.
- Tạo hoặc xem công việc phát sinh nếu được phân quyền.

Trưởng phòng:

- Xem nhân sự trong phòng ban.
- Xem ngày phép, công việc, doanh số và KPI của team.
- Duyệt hoặc đề xuất xác nhận công việc phát sinh của team.

Quản lý:

- Xem toàn bộ dữ liệu khách hàng, hợp đồng, doanh thu, công nợ.
- Xem dashboard tổng.
- Kiểm tra bảng lương và KPI.

Admin:

- Toàn quyền cấu hình danh mục, phân quyền, chính sách lương, import dữ liệu.
- Chốt kỳ doanh thu, công nợ và bảng lương nếu được giao quyền.

## 10. Báo cáo và dashboard cần có

- Tổng doanh thu theo tháng.
- Doanh thu định kỳ so với doanh thu phát sinh một lần.
- Doanh thu theo nhân viên.
- Doanh thu theo khách hàng.
- Doanh thu theo nguồn thu: 3M, TOPA, cấn trừ, đối tác khác.
- Công nợ tổng hợp theo khách hàng.
- Danh sách công nợ quá hạn.
- Khoản phải trả hoặc thu hộ với TOPA.
- KPI nhân sự theo doanh thu, chi phí lương và tỷ lệ hiệu suất.
- Bảng lương tổng theo tháng.
- Phiếu lương cá nhân.
- Báo cáo ngày phép cá nhân và ngày phép theo team.

## 11. Giai đoạn triển khai đề xuất

### Giai đoạn 1: Nền tảng dữ liệu và CRM

- Thiết kế dữ liệu chuẩn cho khách hàng, nhân sự, dịch vụ, hợp đồng.
- Import dữ liệu ban đầu từ sheet.
- Xây dựng màn hình khách hàng, hợp đồng, dịch vụ.
- Thiết lập phân quyền cơ bản.

### Giai đoạn 2: Doanh thu, công việc phát sinh và công nợ

- Xây dựng đơn hàng và doanh thu định kỳ.
- Xây dựng công việc phát sinh ngoài hợp đồng.
- Ghi nhận thanh toán.
- Tự động hóa công nợ tổng hợp và công nợ chi tiết.
- Theo dõi khoản liên quan đến TOPA.

### Giai đoạn 3: Nhân sự, phép và bảng lương

- Xây dựng hồ sơ nhân sự.
- Quản lý ngày phép và lịch nghỉ.
- Cấu hình chính sách lương, phụ cấp, bảo hiểm, thuế, hoa hồng.
- Tính bảng lương theo kỳ.
- Công bố phiếu lương cá nhân.

### Giai đoạn 4: KPI và dashboard quản trị

- Dashboard doanh thu, công nợ, nguồn thu.
- KPI theo nhân viên, phòng ban, tháng.
- Báo cáo hiệu suất chi phí lương trên doanh thu.
- Báo cáo quản trị cho trưởng phòng và quản lý.

## 12. Các điểm cần làm rõ với khách hàng

- Quy định chính xác về kỳ thu phí: tháng, quý, trả trước hay trả sau.
- Cách xác định doanh thu net và doanh thu chia sẻ.
- Quy tắc cấn trừ với TOPA và đối tác khác.
- Quy tắc quá hạn công nợ và số ngày cảnh báo.
- Công thức hoa hồng chi tiết cho từng loại doanh thu.
- Chính sách lương gross/net, bảo hiểm và thuế áp dụng theo từng năm.
- Cấu trúc phòng ban và quyền xem dữ liệu khách hàng của từng vai trò.
- Quy trình duyệt công việc phát sinh và duyệt bảng lương.
- Các sheet nào là nguồn chính thức khi dữ liệu bị trùng hoặc mâu thuẫn.


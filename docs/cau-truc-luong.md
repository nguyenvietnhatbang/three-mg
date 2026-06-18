# Cấu trúc lương và nguyên tắc cấu hình

## 1. Mục tiêu

Tài liệu này mô tả cấu trúc dữ liệu và nguyên tắc tính lương cho hệ thống web quản trị 3M. Nguồn nghiệp vụ ban đầu đến từ sheet lương, nhưng khi đưa lên web cần tách rõ đâu là dữ liệu nhân viên, đâu là chính sách lương, đâu là chỉ số pháp lý thay đổi theo thời gian và đâu là dữ liệu phát sinh theo từng kỳ lương.

Điểm quan trọng: không hard-code các tỷ lệ như BHXH, BHYT, BHTN, thuế TNCN, giảm trừ, hoa hồng hoặc phụ cấp vào công thức cố định trong code. Các chỉ số này phải được quản lý bằng cấu hình có ngày hiệu lực để khi chính sách thay đổi, hệ thống vẫn tính lại đúng cho từng kỳ.

## 2. Nguyên tắc thiết kế

- Tách cấu hình khỏi kết quả tính lương.
- Mỗi chính sách hoặc tỷ lệ phải có ngày bắt đầu hiệu lực và ngày kết thúc hiệu lực nếu có.
- Bảng lương đã chốt phải lưu snapshot kết quả và snapshot chính sách đã dùng tại thời điểm tính.
- Không sửa trực tiếp kết quả kỳ lương đã chốt; nếu cần thay đổi phải mở kỳ, tạo điều chỉnh hoặc tính lại có lưu lịch sử.
- Phân biệt rõ khoản miễn thuế, khoản chịu thuế, khoản giảm trừ, khoản trích vào lương người lao động và khoản tính vào chi phí doanh nghiệp.
- Công thức tính lương nằm ở service/domain logic, không nằm trong giao diện.

## 3. Nhóm dữ liệu trong cấu trúc lương

### 3.1. Thông tin nhân viên và hợp đồng

Đây là dữ liệu định danh và điều kiện áp dụng chính sách cho từng nhân sự.

Trường dữ liệu:

- STT.
- Họ và tên.
- Bậc và phòng ban.
- Loại hợp đồng lao động: full-time, part-time, thử việc hoặc loại khác.
- Hình thức nhận lương: gross hoặc net.
- Trạng thái làm việc.
- Ngày bắt đầu làm việc.
- Ngày nghỉ việc nếu có.
- Tài khoản ngân hàng nhận lương nếu cần quản lý thanh toán.

Ý nghĩa hệ thống:

- Bậc, phòng ban và loại hợp đồng dùng để chọn nhóm chính sách lương phù hợp.
- Hình thức gross/net quyết định cách tính thuế và gross-up.
- Trạng thái làm việc quyết định nhân viên có xuất hiện trong kỳ lương hay không.

### 3.2. Lương cơ bản và thu nhập miễn thuế

Đây là các khoản thu nhập cố định hoặc định kỳ, trong đó có nhóm không tính thuế TNCN theo chính sách nội bộ và quy định áp dụng.

Trường dữ liệu:

- Lương cơ bản.
- Ăn trưa.
- Trang phục.
- Tăng ca vượt đơn giá tiền công.
- Thưởng sáng kiến, văn phòng xanh sạch đẹp.
- Tổng thu nhập miễn thuế.

Ý nghĩa hệ thống:

- Lương cơ bản thường là cấu hình cá nhân theo hợp đồng hoặc phụ lục hợp đồng.
- Các khoản miễn thuế phải được khai báo bằng loại thu nhập, không chỉ lưu thành một cột tổng.
- Tổng thu nhập miễn thuế là kết quả tính từ các khoản chi tiết, không nên nhập tay nếu hệ thống đã đủ dữ liệu.

### 3.3. Các khoản hỗ trợ và thưởng tính thuế TNCN

Đây là nhóm thu nhập biến đổi, thường phụ thuộc doanh số, khách hàng, khu vực làm việc hoặc đánh giá nội bộ.

Trường dữ liệu:

- Hoa hồng vượt doanh số.
- Khách 1 lần.
- Hoa hồng khách hàng mới.
- Hỗ trợ đi lại.
- Chuyên cần.
- Trách nhiệm.
- Cộng các khoản hỗ trợ và thưởng.

Quy tắc nghiệp vụ:

- Hoa hồng vượt doanh số tính dựa trên doanh thu vượt định mức, ví dụ 10% phần doanh thu vượt.
- Khách 1 lần là thưởng cho khách hàng giao dịch một lần, ví dụ tỷ lệ 10% đến 30%.
- Hoa hồng khách hàng mới có thể tính theo phí dịch vụ tháng đầu, ví dụ 15%.
- Hỗ trợ đi lại phụ thuộc khu vực như Biên Hòa, TP.HCM, tỉnh.
- Chuyên cần và trách nhiệm có thể là khoản cố định theo chính sách hoặc khoản điều chỉnh theo từng kỳ.

Ý nghĩa hệ thống:

- Không gom toàn bộ vào một trường "Cộng" làm dữ liệu gốc.
- Mỗi khoản cần có loại thu nhập, cách tính, nguồn dữ liệu và trạng thái chịu thuế.
- Tổng cộng là kết quả tính toán từ các khoản chi tiết.

### 3.4. Tính toán lương và thu nhập chịu thuế

Đây là nhóm kết quả trung gian để tính thuế, bảo hiểm và thực nhận.

Trường dữ liệu:

- Tổng lương.
- Công Tg, tức tổng số ngày công làm việc thực tế.
- Lương thời gian.
- Lương gross-up nếu nhân viên nhận lương net.
- Thu nhập chịu thuế.

Quy tắc nghiệp vụ:

- Tổng lương là tổng thu nhập gộp trước khi trừ các khoản người lao động phải chịu.
- Công thực tế ảnh hưởng đến lương thời gian nếu nhân viên không làm đủ kỳ.
- Lương gross-up dùng khi công ty cam kết lương net và cần quy đổi ngược ra gross để tính thuế.
- Thu nhập chịu thuế phải loại trừ các khoản miễn thuế hợp lệ và cộng các khoản thưởng/hỗ trợ chịu thuế.

### 3.5. Các khoản giảm trừ và thuế TNCN

Đây là nhóm dùng để xác định thu nhập tính thuế và số thuế TNCN phải nộp.

Trường dữ liệu:

- Giảm trừ bản thân.
- Số người phụ thuộc.
- Số tiền giảm trừ người phụ thuộc.
- Bảo hiểm trích vào lương người lao động.
- Tổng cộng giảm trừ.
- Thu nhập tính thuế TNCN.
- Thuế TNCN phải nộp.

Quy tắc nghiệp vụ:

- Giảm trừ bản thân là chỉ số pháp lý thay đổi theo thời gian.
- Mức giảm trừ người phụ thuộc là chỉ số pháp lý thay đổi theo thời gian.
- Số người phụ thuộc là dữ liệu cá nhân của nhân viên và có thể thay đổi theo từng giai đoạn.
- Thuế TNCN phải tính theo biểu thuế lũy tiến hoặc chính sách thuế tương ứng với loại hợp đồng.

### 3.6. Thực nhận và thanh toán

Đây là nhóm kết quả cuối cùng để chi trả cho nhân viên.

Trường dữ liệu:

- Lương thực nhận.
- Tạm ứng.
- Bù hoàn ứng.
- Phụ cấp khác.
- Thu nhập chuyển khoản.

Quy tắc nghiệp vụ:

- Lương thực nhận là số tiền sau khi trừ thuế, bảo hiểm và các khoản khấu trừ của người lao động.
- Tạm ứng là dữ liệu phát sinh theo kỳ hoặc theo phiếu tạm ứng.
- Bù hoàn ứng và phụ cấp khác cần có lý do, người tạo và kỳ áp dụng.
- Thu nhập chuyển khoản là số tiền thực tế chi trả sau tất cả điều chỉnh.

### 3.7. Chi phí bảo hiểm

Đây là nhóm khoản trích bảo hiểm và kinh phí công đoàn, cần tách phần doanh nghiệp chịu và phần người lao động chịu.

Bảo hiểm trích vào chi phí doanh nghiệp:

- BHXH, ví dụ 17.5%.
- BHYT, ví dụ 3%.
- BHTN, ví dụ 1%.
- KPCĐ.

Bảo hiểm trích vào lương người lao động:

- BHXH, ví dụ 8%.
- BHYT, ví dụ 1.5%.
- BHTN, ví dụ 1%.

Kết quả:

- Tổng bảo hiểm doanh nghiệp phải nộp.
- Tổng bảo hiểm người lao động bị trừ vào lương.
- Tổng bảo hiểm phải nộp cho cơ quan BHXH.

Lưu ý: các tỷ lệ trên là dữ liệu nghiệp vụ từ sheet hoặc ví dụ cấu hình ban đầu. Khi triển khai thực tế, phải lưu các tỷ lệ này trong bảng cấu hình có hiệu lực theo thời gian để cập nhật khi quy định thay đổi.

## 4. Phân loại cấu hình

### 4.1. Cấu hình tổng thể theo thời gian

Đây là nhóm chỉ số áp dụng toàn hệ thống hoặc gần như toàn hệ thống. Các giá trị này thường thay đổi theo luật, năm tài chính hoặc chính sách công ty.

Nên cấu hình ở cấp tổng thể:

- Mức giảm trừ bản thân.
- Mức giảm trừ người phụ thuộc.
- Biểu thuế TNCN lũy tiến.
- Tỷ lệ BHXH doanh nghiệp đóng.
- Tỷ lệ BHYT doanh nghiệp đóng.
- Tỷ lệ BHTN doanh nghiệp đóng.
- Tỷ lệ kinh phí công đoàn.
- Tỷ lệ BHXH người lao động đóng.
- Tỷ lệ BHYT người lao động đóng.
- Tỷ lệ BHTN người lao động đóng.
- Công thức gross-up cho nhân viên nhận lương net.
- Số ngày công chuẩn trong tháng nếu công ty dùng một chuẩn chung.
- Danh mục loại thu nhập và trạng thái chịu thuế/miễn thuế.
- Danh mục loại khấu trừ.

Yêu cầu dữ liệu:

- Có `effective_from`.
- Có `effective_to` nếu chính sách hết hiệu lực.
- Có trạng thái nháp, đang áp dụng, ngưng áp dụng.
- Có người tạo, người cập nhật và lý do thay đổi.

### 4.2. Cấu hình theo nhóm

Đây là nhóm chính sách áp dụng cho một nhóm nhân sự, không nên cấu hình lặp lại từng người nếu nhiều nhân viên dùng chung quy tắc.

Có thể cấu hình theo:

- Phòng ban.
- Bậc hoặc cấp nhân sự.
- Loại hợp đồng.
- Hình thức lương gross/net.
- Khu vực làm việc.
- Vai trò hoặc chức danh.

Nên cấu hình ở cấp nhóm:

- Chính sách hoa hồng vượt doanh số.
- Định mức doanh số tối thiểu, ví dụ 3 lần tổng lương.
- Tỷ lệ thưởng phần doanh thu vượt, ví dụ 10%.
- Chính sách hoa hồng khách 1 lần, ví dụ 10% đến 30%.
- Chính sách hoa hồng khách hàng mới, ví dụ 15% phí tháng đầu.
- Mức hỗ trợ đi lại theo khu vực.
- Mức thưởng chuyên cần.
- Mức phụ cấp trách nhiệm theo chức danh.
- Quy tắc tính lương theo ngày công cho từng loại hợp đồng.
- Quy tắc áp dụng bảo hiểm cho thử việc, part-time hoặc full-time.

Yêu cầu dữ liệu:

- Có phạm vi áp dụng rõ ràng.
- Có độ ưu tiên nếu một nhân viên thuộc nhiều nhóm.
- Có ngày hiệu lực.
- Có cơ chế override ở cấp cá nhân nếu được phép.

### 4.3. Cấu hình cá nhân

Đây là thông tin riêng của từng nhân viên hoặc ngoại lệ đã được duyệt.

Nên cấu hình ở cấp cá nhân:

- Lương cơ bản theo hợp đồng.
- Hình thức nhận lương gross hoặc net.
- Loại hợp đồng hiện tại.
- Phòng ban và bậc hiện tại.
- Số người phụ thuộc theo từng giai đoạn.
- Thông tin tham gia bảo hiểm.
- Mức phụ cấp cá nhân nếu không theo nhóm.
- Tài khoản ngân hàng.
- Trạng thái được tính hoa hồng.
- Nhân viên có được nhận hoa hồng khách mới, khách 1 lần hoặc vượt doanh số hay không.
- Các ngoại lệ được duyệt như phụ cấp riêng, khấu trừ riêng, điều chỉnh riêng.

Yêu cầu dữ liệu:

- Mỗi thay đổi quan trọng phải có ngày hiệu lực.
- Không ghi đè mất lịch sử lương cũ.
- Ngoại lệ cá nhân cần có lý do và người phê duyệt.

### 4.4. Dữ liệu phát sinh theo kỳ lương

Đây không phải cấu hình cố định mà là dữ liệu phát sinh trong một tháng hoặc một kỳ lương cụ thể.

Dữ liệu theo kỳ:

- Ngày công thực tế.
- Nghỉ không lương nếu có.
- Tăng ca.
- Doanh số trong kỳ.
- Doanh thu vượt định mức.
- Job khách 1 lần.
- Khách hàng mới phát sinh trong kỳ.
- Tạm ứng.
- Bù hoàn ứng.
- Phụ cấp phát sinh.
- Khấu trừ phát sinh.
- Ghi chú điều chỉnh.

Yêu cầu dữ liệu:

- Gắn với kỳ lương cụ thể.
- Gắn với nhân viên cụ thể.
- Có nguồn dữ liệu rõ ràng, ví dụ doanh thu, công việc phát sinh, đơn tạm ứng hoặc nhập tay có duyệt.
- Khi kỳ lương đã chốt, dữ liệu phát sinh liên quan không được âm thầm làm thay đổi kết quả đã chốt.

## 5. Công thức tổng quát

Các công thức dưới đây là khung nghiệp vụ để thiết kế hệ thống. Công thức chi tiết cần được cấu hình và kiểm chứng với khách hàng trước khi triển khai.

### 5.1. Tổng thu nhập miễn thuế

```txt
Tổng TN miễn thuế =
  Ăn trưa
  + Trang phục
  + Tăng ca vượt đơn giá tiền công
  + Thưởng sáng kiến / văn phòng xanh sạch đẹp
```

### 5.2. Tổng hỗ trợ và thưởng chịu thuế

```txt
Cộng hỗ trợ và thưởng =
  Hoa hồng vượt doanh số
  + Hoa hồng khách 1 lần
  + Hoa hồng khách hàng mới
  + Hỗ trợ đi lại
  + Chuyên cần
  + Trách nhiệm
  + Khoản thưởng/phụ cấp chịu thuế khác
```

### 5.3. Tổng lương

```txt
Tổng lương =
  Lương thời gian / Lương gross-up
  + Tổng TN miễn thuế
  + Cộng hỗ trợ và thưởng
```

### 5.4. Thu nhập chịu thuế

```txt
Thu nhập chịu thuế =
  Tổng thu nhập chịu thuế
  - Các khoản được xác định là miễn thuế
```

Trong hệ thống, nên tính theo từng loại dòng thu nhập để tránh nhầm:

```txt
Thu nhập chịu thuế =
  Tổng các dòng thu nhập có taxability = taxable
```

### 5.5. Tổng giảm trừ

```txt
Tổng giảm trừ =
  Giảm trừ bản thân
  + Số người phụ thuộc * Mức giảm trừ mỗi người phụ thuộc
  + Bảo hiểm người lao động đóng
  + Khoản giảm trừ hợp lệ khác
```

### 5.6. Thu nhập tính thuế TNCN

```txt
Thu nhập tính thuế TNCN =
  max(Thu nhập chịu thuế - Tổng giảm trừ, 0)
```

### 5.7. Lương thực nhận

```txt
Lương thực nhận =
  Tổng lương
  - Bảo hiểm người lao động đóng
  - Thuế TNCN phải nộp
  - Khấu trừ khác
```

### 5.8. Thu nhập chuyển khoản

```txt
Thu nhập CK =
  Lương thực nhận
  - Tạm ứng
  + Bù hoàn ứng
  + Điều chỉnh tăng
  - Điều chỉnh giảm
```

## 6. Quy trình tính lương theo kỳ

1. Tạo kỳ lương ở trạng thái nháp.
2. Chọn chính sách lương, thuế, bảo hiểm có hiệu lực tại kỳ đó.
3. Lấy danh sách nhân viên đủ điều kiện tính lương.
4. Lấy cấu hình cá nhân của từng nhân viên tại kỳ đó.
5. Tổng hợp ngày công, doanh số, hoa hồng, tạm ứng và điều chỉnh phát sinh.
6. Tính từng dòng thu nhập, từng dòng khấu trừ và các khoản bảo hiểm.
7. Tính thu nhập chịu thuế, thu nhập tính thuế và thuế TNCN.
8. Tính lương thực nhận và thu nhập chuyển khoản.
9. Người phụ trách kiểm tra, điều chỉnh nếu cần và lưu lý do.
10. Chốt bảng lương.
11. Công bố phiếu lương cá nhân cho nhân viên.

## 7. Trạng thái bảng lương

- `draft`: đang tạo hoặc đang tính thử.
- `calculated`: đã tính xong nhưng chưa kiểm tra.
- `reviewing`: đang kiểm tra.
- `approved`: đã duyệt.
- `locked`: đã chốt, không cho sửa trực tiếp.
- `paid`: đã thanh toán.
- `cancelled`: đã hủy.

Quy tắc trạng thái:

- Chỉ bảng lương chưa chốt mới được tính lại tự do.
- Bảng lương đã chốt phải lưu snapshot công thức, tỷ lệ và kết quả.
- Nếu cần sửa bảng lương đã chốt, phải tạo bản điều chỉnh hoặc mở khóa có quyền cao và lưu lịch sử.
- Nhân viên chỉ xem được phiếu lương cá nhân sau khi kỳ lương được duyệt hoặc công bố.

## 8. Mô hình dữ liệu đề xuất

Các bảng cấu hình:

- `payroll_policy_versions`: phiên bản chính sách lương theo thời gian.
- `tax_policy_versions`: chính sách thuế và giảm trừ theo thời gian.
- `insurance_policy_versions`: tỷ lệ bảo hiểm và kinh phí công đoàn theo thời gian.
- `income_types`: danh mục loại thu nhập, chịu thuế hoặc miễn thuế.
- `deduction_types`: danh mục loại khấu trừ.
- `commission_policies`: chính sách hoa hồng.
- `allowance_policies`: chính sách phụ cấp.

Các bảng nhân sự:

- `employees`: hồ sơ nhân viên.
- `employee_contracts`: hợp đồng lao động và thay đổi lương cơ bản theo thời gian.
- `employee_dependents`: người phụ thuộc theo từng giai đoạn.
- `employee_payroll_settings`: cấu hình lương cá nhân.
- `employee_policy_overrides`: ngoại lệ cá nhân đã duyệt.

Các bảng kỳ lương:

- `payroll_periods`: kỳ lương.
- `payroll_inputs`: dữ liệu đầu vào theo kỳ như ngày công, tạm ứng, điều chỉnh.
- `payroll_lines`: kết quả lương tổng của từng nhân viên.
- `payroll_income_lines`: chi tiết từng khoản thu nhập.
- `payroll_deduction_lines`: chi tiết từng khoản khấu trừ.
- `payroll_insurance_lines`: chi tiết từng khoản bảo hiểm.
- `payroll_tax_lines`: chi tiết thuế TNCN.
- `payroll_snapshots`: snapshot chính sách và công thức đã dùng khi chốt.

## 9. Các điểm cần xác nhận với khách hàng

- Lương cơ bản trong sheet là gross hay net theo từng nhân viên.
- Công ty dùng số ngày công chuẩn cố định hay theo lịch từng tháng.
- Khoản tăng ca vượt đơn giá tiền công được miễn thuế theo điều kiện nào.
- Thưởng sáng kiến và văn phòng xanh sạch đẹp luôn miễn thuế hay tùy chính sách.
- Tỷ lệ hoa hồng khách 1 lần được chọn theo tiêu chí nào trong khoảng 10% đến 30%.
- Doanh số tối thiểu để tính hoa hồng vượt doanh số lấy theo tổng lương, lương cơ bản hay chi phí lương.
- Doanh thu dùng để tính hoa hồng là doanh thu gross, net, đã thu tiền hay đã xuất hóa đơn.
- Khách hàng mới được xác định theo ngày ký hợp đồng, ngày phát sinh doanh thu hay ngày thanh toán.
- Hỗ trợ đi lại theo Biên Hòa, TP.HCM, tỉnh là mức cố định hay theo số ngày đi thực tế.
- Chuyên cần và trách nhiệm là khoản tự động, nhập tay hay cần duyệt.
- Chính sách bảo hiểm áp dụng cho thử việc, part-time và full-time khác nhau thế nào.
- Có giới hạn trần đóng bảo hiểm cần cấu hình hay không.
- Bảng lương đã chốt có cho phép mở lại hay chỉ tạo điều chỉnh ở kỳ sau.


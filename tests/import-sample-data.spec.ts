import { test, expect, type Page } from "@playwright/test";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createRecord(
  page: Page,
  path: string,
  buttonText: string,
  fields: Record<string, string | number | boolean>
) {
  console.log(`Navigating to ${path}...`);
  await page.goto(path);
  await page.waitForSelector('button:has-text("Tải lại")');
  
  console.log(`Clicking "${buttonText}"...`);
  await page.click(`button:has-text("${buttonText}")`);
  await page.waitForSelector("#management-record-form");

  const form = page.locator("#management-record-form");

  for (const [key, val] of Object.entries(fields)) {
    const escapedKey = escapeRegExp(key);
    const labelRegex = new RegExp(`^${escapedKey}(\\s*\\*)?$`);
    const labelLocator = form.locator("label").filter({ has: page.locator("span").filter({ hasText: labelRegex }) });
    if (typeof val === "boolean") {
      const checkbox = labelLocator.locator('input[type="checkbox"]');
      const isChecked = await checkbox.isChecked();
      if (isChecked !== val) {
        await checkbox.click();
      }
    } else {
      const input = labelLocator.locator("input, select, textarea");
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "select") {
        await expect(input).toBeEnabled({ timeout: 5000 });
        await expect.poll(async () => {
          const optionsText = await input.locator("option").evaluateAll((opts: HTMLOptionElement[]) =>
            opts.map((o) => o.textContent || "")
          );
          if (optionsText.length === 0) return false;
          return !optionsText.some((t) => t.includes("Đang tải"));
        }, {
          message: "Wait for select options to load",
          timeout: 5000,
        }).toBe(true);

        const optionValues = await input.locator("option").evaluateAll((options: HTMLOptionElement[]) =>
          options.map((opt) => ({ text: opt.textContent || "", value: opt.value }))
        );
        const targetOption = optionValues.find((opt) => opt.text.includes(String(val)));
        if (!targetOption) {
          throw new Error(
            `Could not find option containing "${val}" in select for "${key}". Available options: ${JSON.stringify(
              optionValues.map((o) => o.text)
            )}`
          );
        }
        await input.selectOption(targetOption.value);
      } else {
        await input.fill(String(val));
      }
    }
  }

  console.log('Clicking "Lưu"...');
  await page.locator('div[role="dialog"] button:has-text("Lưu")').click();

  try {
    await page.waitForSelector("#management-record-form", { state: "detached", timeout: 5000 });
  } catch {
    const errorText = await page.locator("div.bg-red-50.text-red-700 span").first().textContent().catch(() => null);
    throw new Error(
      `Failed to save record on path ${path} with fields ${JSON.stringify(fields)}. Error shown: ${
        errorText || "Unknown error / timeout"
      }`
    );
  }
  console.log("Record saved successfully.");
}

async function runRowAction(page: Page, path: string, recordText: string, actionTitle: string, confirmLabel: string) {
  console.log(`Running action "${actionTitle}" for record "${recordText}" on ${path}...`);
  await page.goto(path);
  await page.waitForSelector('button:has-text("Tải lại")');

  // Find row containing recordText
  const row = page.locator(`tr:has-text("${recordText}")`);
  const button = row.locator(`button[title="${actionTitle}"]`);
  await button.click();

  // Wait for Confirm Dialog
  await page.waitForSelector('button:has-text("Hủy")');
  
  // Click the confirmation button matching the label inside the dialog
  const dialog = page.locator('div[role="dialog"]');
  await dialog.locator(`button:has-text("${confirmLabel}")`).click();
  
  // Wait for Confirm Dialog to close
  try {
    await expect(dialog).toBeHidden({ timeout: 4000 });
  } catch {
    const errorBanner = page.locator("div.bg-red-50.text-red-700 span, div.text-red-700, .bg-red-50").first();
    const errorText = await errorBanner.textContent().catch(() => null);
    throw new Error(`Action "${actionTitle}" on "${recordText}" failed. Dialog did not close. Error: ${errorText ? errorText.trim() : "Unknown / Timeout"}`);
  }

  // Check if there is an error banner on the page
  const errorBanner = page.locator("div.bg-red-50.text-red-700 span").first();
  if (await errorBanner.isVisible()) {
    const errorText = await errorBanner.textContent();
    throw new Error(`Action "${actionTitle}" on "${recordText}" failed with error: ${errorText}`);
  }

  // Wait for loading to finish and table to reload
  await page.waitForTimeout(1000);
  console.log(`Action "${actionTitle}" completed.`);
}

test("Import sample data step by step", async ({ page }) => {
  // Set longer timeout for the whole process
  test.setTimeout(360000);

  console.log("=== STEP 1: Log in ===");
  await page.goto("/login");
  await page.locator('label:has-text("Email") input').fill("admin@gmail.com");
  await page.locator('label:has-text("Mật khẩu") input').fill("admin1234");
  await page.click('button:has-text("Đăng nhập")');
  await page.waitForURL("/crm");
  console.log("Logged in successfully!");

  console.log("=== STEP 2: Create Departments ===");
  await createRecord(page, "/hr/departments", "Thêm phòng ban", {
    "Mã phòng ban": "BP-ACC",
    "Tên phòng ban": "Bộ phận Kế toán",
    "Mô tả": "Bộ phận thực hiện kế toán và báo cáo thuế",
  });
  await createRecord(page, "/hr/departments", "Thêm phòng ban", {
    "Mã phòng ban": "BP-SALES",
    "Tên phòng ban": "Bộ phận Kinh doanh",
    "Mô tả": "Bộ phận tìm kiếm và chăm sóc khách hàng",
  });

  console.log("=== STEP 3: Create Job Levels ===");
  await createRecord(page, "/hr/job-levels", "Thêm bậc", {
    "Mã bậc": "LV-STAFF",
    "Tên bậc/chức danh": "Nhân viên",
    "Thứ tự cấp bậc": 1,
    "Mô tả": "Nhân viên chính thức",
  });
  await createRecord(page, "/hr/job-levels", "Thêm bậc", {
    "Mã bậc": "LV-LEAD",
    "Tên bậc/chức danh": "Trưởng nhóm",
    "Thứ tự cấp bậc": 2,
    "Mô tả": "Trưởng nhóm nghiệp vụ",
  });
  await createRecord(page, "/hr/job-levels", "Thêm bậc", {
    "Mã bậc": "LV-MANAGER",
    "Tên bậc/chức danh": "Trưởng phòng",
    "Thứ tự cấp bậc": 3,
    "Mô tả": "Quản lý cấp trung",
  });

  console.log("=== STEP 4: Create Employees ===");
  await createRecord(page, "/hr/employees", "Thêm nhân viên", {
    "Mã nhân viên": "NV-ACC-01",
    "Họ và tên": "Nguyễn Văn Kế Toán",
    "Phòng ban": "BP-ACC",
    "Bậc/chức danh": "LV-STAFF",
    "Trạng thái": "Đang làm",
    "Ngày vào làm": "2026-01-01",
    "Email cá nhân": "nv.acc01@example.com",
    "Loại hợp đồng": "Full-time",
    "Hình thức nhận lương": "Gross",
    "Lương cơ bản": 15000000,
    "Ngày công chuẩn": 26,
    "Hiệu lực từ": "2026-01-01",
  });

  await createRecord(page, "/hr/employees", "Thêm nhân viên", {
    "Mã nhân viên": "NV-SALES-01",
    "Họ và tên": "Trần Thị Kinh Doanh",
    "Phòng ban": "BP-SALES",
    "Bậc/chức danh": "LV-STAFF",
    "Trạng thái": "Đang làm",
    "Ngày vào làm": "2026-01-01",
    "Email cá nhân": "nv.sales01@example.com",
    "Loại hợp đồng": "Full-time",
    "Hình thức nhận lương": "Net",
    "Lương cơ bản": 12000000,
    "Ngày công chuẩn": 26,
    "Hiệu lực từ": "2026-01-01",
  });

  await createRecord(page, "/hr/employees", "Thêm nhân viên", {
    "Mã nhân viên": "NV-LEAD-01",
    "Họ và tên": "Phạm Trưởng Phòng",
    "Phòng ban": "BP-SALES",
    "Bậc/chức danh": "LV-MANAGER",
    "Trạng thái": "Đang làm",
    "Ngày vào làm": "2026-01-01",
    "Email cá nhân": "nv.lead01@example.com",
    "Loại hợp đồng": "Full-time",
    "Hình thức nhận lương": "Gross",
    "Lương cơ bản": 25000000,
    "Ngày công chuẩn": 26,
    "Hiệu lực từ": "2026-01-01",
  });

  console.log("=== STEP 5: Create Payroll Settings ===");
  await createRecord(page, "/hr/payroll-settings", "Thêm cấu hình lương", {
    "Nhân viên": "Nguyễn Văn Kế Toán",
    "Hình thức lương": "Gross",
    "Tham gia bảo hiểm": true,
    "Được nhận hoa hồng": true,
    "Hoa hồng vượt doanh số": true,
    "Hoa hồng khách 1 lần": true,
    "Hoa hồng khách mới": true,
    "Hiệu lực từ": "2026-01-01",
  });

  await createRecord(page, "/hr/payroll-settings", "Thêm cấu hình lương", {
    "Nhân viên": "Trần Thị Kinh Doanh",
    "Hình thức lương": "Net",
    "Tham gia bảo hiểm": true,
    "Được nhận hoa hồng": true,
    "Hoa hồng vượt doanh số": true,
    "Hoa hồng khách 1 lần": true,
    "Hoa hồng khách mới": true,
    "Hiệu lực từ": "2026-01-01",
  });

  await createRecord(page, "/hr/payroll-settings", "Thêm cấu hình lương", {
    "Nhân viên": "Phạm Trưởng Phòng",
    "Hình thức lương": "Gross",
    "Tham gia bảo hiểm": true,
    "Được nhận hoa hồng": true,
    "Hoa hồng vượt doanh số": true,
    "Hoa hồng khách 1 lần": true,
    "Hoa hồng khách mới": true,
    "Hiệu lực từ": "2026-01-01",
  });

  console.log("=== STEP 6: Create Services ===");
  await createRecord(page, "/crm/services", "Thêm dịch vụ", {
    "Mã dịch vụ": "DV-KETOAN",
    "Tên dịch vụ": "Dịch vụ kế toán trọn gói",
    "Loại dịch vụ": "recurring",
    "Đơn giá chuẩn": 2000000,
    "Đang hoạt động": true,
    "Mô tả": "Dịch vụ kế toán thuế hàng tháng",
  });

  await createRecord(page, "/crm/services", "Thêm dịch vụ", {
    "Mã dịch vụ": "DV-BAOCAO",
    "Tên dịch vụ": "Lập báo cáo tài chính năm",
    "Loại dịch vụ": "one_time",
    "Đơn giá chuẩn": 5000000,
    "Đang hoạt động": true,
    "Mô tả": "Lập báo cáo tài chính năm tài khóa",
  });

  console.log("=== STEP 7: Create Customers ===");
  await createRecord(page, "/crm/customers", "Thêm khách hàng", {
    "Mã khách hàng": "KH-COMPANY-A",
    "Tên công ty": "Công ty TNHH Thương mại A",
    "Tên gọi tắt": "Công ty A",
    "Mã số thuế": "0112233445",
    "Địa chỉ": "123 Đường A, Quận 1, TP HCM",
    "Email": "info@comp-a.com",
    "Số điện thoại": "0901234567",
    "Người đại diện": "Nguyễn Văn A",
    "Chức vụ": "Giám đốc",
    "Phần mềm kế toán": "MISA",
    "Nhân sự phụ trách": "Trần Thị Kinh Doanh",
    "Pháp nhân mặc định": "3M",
    "Trạng thái": "Đang hoạt động",
  });

  await createRecord(page, "/crm/customers", "Thêm khách hàng", {
    "Mã khách hàng": "KH-COMPANY-B",
    "Tên công ty": "Công ty Cổ phần Sản xuất B",
    "Tên gọi tắt": "Công ty B",
    "Mã số thuế": "0112233446",
    "Địa chỉ": "456 Đường B, Biên Hòa, Đồng Nai",
    "Email": "info@comp-b.com",
    "Số điện thoại": "0907654321",
    "Người đại diện": "Trần Thị B",
    "Chức vụ": "Giám đốc",
    "Phần mềm kế toán": "FAST",
    "Nhân sự phụ trách": "Trần Thị Kinh Doanh",
    "Pháp nhân mặc định": "3M",
    "Trạng thái": "Đang hoạt động",
  });

  console.log("=== STEP 8: Create Contracts ===");
  await createRecord(page, "/crm/contracts", "Thêm hợp đồng", {
    "Mã hợp đồng": "HD-2026-A",
    "Khách hàng": "Công ty TNHH Thương mại A",
    "Pháp nhân ký": "3M",
    "Nhân sự phụ trách": "Trần Thị Kinh Doanh",
    "Trạng thái": "Còn hiệu lực",
    "Kỳ tính phí": "Hàng tháng",
    "Phí dịch vụ hàng tháng": 2000000,
    "Giá trị hợp đồng": 24000000,
    "VAT": 0.1,
    "Hạn thanh toán (ngày)": 15,
    "Ngày hiệu lực": "2026-01-01",
    "Bắt đầu tính phí": "2026-01-01",
  });

  await createRecord(page, "/crm/contracts", "Thêm hợp đồng", {
    "Mã hợp đồng": "HD-2026-B",
    "Khách hàng": "Công ty Cổ phần Sản xuất B",
    "Pháp nhân ký": "3M",
    "Nhân sự phụ trách": "Trần Thị Kinh Doanh",
    "Trạng thái": "Còn hiệu lực",
    "Kỳ tính phí": "Hàng tháng",
    "Phí dịch vụ hàng tháng": 3000000,
    "Giá trị hợp đồng": 36000000,
    "VAT": 0.1,
    "Hạn thanh toán (ngày)": 15,
    "Ngày hiệu lực": "2026-01-01",
    "Bắt đầu tính phí": "2026-01-01",
  });

  console.log("=== STEP 9: Link Contract Services ===");
  await createRecord(page, "/crm/contract-services", "Thêm dịch vụ hợp đồng", {
    "Hợp đồng": "HD-2026-A",
    "Dịch vụ": "Dịch vụ kế toán trọn gói",
    "Kỳ tính phí": "Hàng tháng",
    "Số lượng": 1,
    "Đơn giá": 2000000,
    "VAT": 0.1,
    "Dịch vụ chính": true,
    "Hiệu lực từ": "2026-01-01",
  });

  await createRecord(page, "/crm/contract-services", "Thêm dịch vụ hợp đồng", {
    "Hợp đồng": "HD-2026-B",
    "Dịch vụ": "Dịch vụ kế toán trọn gói",
    "Kỳ tính phí": "Hàng tháng",
    "Số lượng": 1,
    "Đơn giá": 3000000,
    "VAT": 0.1,
    "Dịch vụ chính": true,
    "Hiệu lực từ": "2026-01-01",
  });

  console.log("=== STEP 10: Create Payroll & Tax & Insurance Policies ===");
  await createRecord(page, "/payroll/payroll-policy-versions", "Thêm chính sách lương", {
    "Mã chính sách": "PP-2026",
    "Tên chính sách": "Chính sách lương 2026",
    "Trạng thái": "Đang áp dụng",
    "Ngày công chuẩn": 26,
    "Phương pháp gross-up": "standard",
    "Hiệu lực từ": "2026-01-01",
  });

  await createRecord(page, "/payroll/tax-policy-versions", "Thêm chính sách thuế", {
    "Mã chính sách": "TP-2026",
    "Tên chính sách": "Chính sách thuế 2026",
    "Trạng thái": "Đang áp dụng",
    "Giảm trừ bản thân": 11000000,
    "Giảm trừ người phụ thuộc": 4400000,
    "Phương pháp thuế": "progressive",
    "Hiệu lực từ": "2026-01-01",
  });

  // Create Tax Brackets
  await createRecord(page, "/payroll/tax-policy-brackets", "Thêm bậc thuế", {
    "Chính sách thuế": "Chính sách thuế 2026",
    "Thứ tự bậc": 1,
    "Từ mức": 0,
    "Đến mức": 5000000,
    "Tỷ lệ thuế": 0.05,
    "Giảm trừ nhanh": 0,
  });
  await createRecord(page, "/payroll/tax-policy-brackets", "Thêm bậc thuế", {
    "Chính sách thuế": "Chính sách thuế 2026",
    "Thứ tự bậc": 2,
    "Từ mức": 5000000,
    "Đến mức": 10000000,
    "Tỷ lệ thuế": 0.1,
    "Giảm trừ nhanh": 250000,
  });
  await createRecord(page, "/payroll/tax-policy-brackets", "Thêm bậc thuế", {
    "Chính sách thuế": "Chính sách thuế 2026",
    "Thứ tự bậc": 3,
    "Từ mức": 10000000,
    "Đến mức": 18000000,
    "Tỷ lệ thuế": 0.15,
    "Giảm trừ nhanh": 750000,
  });

  await createRecord(page, "/payroll/insurance-policy-versions", "Thêm chính sách BH", {
    "Mã chính sách": "IP-2026",
    "Tên chính sách": "Chính sách bảo hiểm 2026",
    "Trạng thái": "Đang áp dụng",
    "NLĐ BHXH": 0.08,
    "NLĐ BHYT": 0.015,
    "NLĐ BHTN": 0.01,
    "DN BHXH": 0.175,
    "DN BHYT": 0.03,
    "DN BHTN": 0.01,
    "KPCĐ": 0.02,
    "Sàn đóng BH": 4729400,
    "Trần đóng BH": 36000000,
    "Hiệu lực từ": "2026-01-01",
  });

  console.log("=== STEP 11: Create One-time Task ===");
  await createRecord(page, "/revenue/one-time-tasks", "Tạo task phát sinh", {
    "Mã task": "TSK-2026-02-01",
    "Khách hàng": "Công ty TNHH Thương mại A",
    "Dịch vụ": "Lập báo cáo tài chính năm",
    "Nhân sự phụ trách": "Nguyễn Văn Kế Toán",
    "Nhân sự nhận hoa hồng": "Trần Thị Kinh Doanh",
    "Trạng thái": "Nháp",
    "Ngày phát sinh": "2026-02-15",
    "Mô tả": "Lập báo cáo tài chính năm 2025 cho Công ty A",
    "Số lượng": 1,
    "Đơn giá": 5000000,
    "VAT": 0.1,
    "Nguồn thu": "3M",
  });

  // Run through one-time task workflow
  await runRowAction(page, "/revenue/one-time-tasks", "TSK-2026-02-01", "Gửi duyệt", "Gửi duyệt");
  await runRowAction(page, "/revenue/one-time-tasks", "TSK-2026-02-01", "Duyệt", "Duyệt");
  await runRowAction(page, "/revenue/one-time-tasks", "TSK-2026-02-01", "Hoàn tất", "Hoàn tất");

  console.log("=== STEP 12: Create Recurring Revenue Batch ===");
  await createRecord(page, "/revenue/recurring-batches", "Tạo batch", {
    "Mã batch": "REV-2026-02",
    "Từ ngày": "2026-02-01",
    "Đến ngày": "2026-02-28",
    "Trạng thái": "Nháp",
    "Ghi chú": "Sinh doanh thu tháng 2/2026",
  });

  // Run through recurring batch workflow
  await runRowAction(page, "/revenue/recurring-batches", "REV-2026-02", "Sinh doanh thu", "Sinh");
  await runRowAction(page, "/revenue/recurring-batches", "REV-2026-02", "Duyệt batch", "Duyệt");
  await runRowAction(page, "/revenue/recurring-batches", "REV-2026-02", "Khóa batch", "Khóa");

  console.log("=== STEP 13: Create Payment ===");
  // We need to look up Customer A's recurring order number. Let's find it.
  await page.goto("/revenue/orders");
  await page.waitForSelector('button:has-text("Tải lại")');
  // Wait for loading to finish
  await page.waitForTimeout(1000);
  
  // Find order for Company A recurring. It should have type "Định kỳ".
  const orderRow = page.locator('tr:has-text("Công ty TNHH Thương mại A"):has-text("Định kỳ")').first();
  const orderNo = await orderRow.locator('td').first().textContent();
  console.log(`Found recurring order number for Company A: ${orderNo}`);

  if (!orderNo) {
    throw new Error("Could not find generated recurring order for Company A");
  }

  // Issue both the recurring order and the one-time task order so they appear in finance lookups
  await runRowAction(page, "/revenue/orders", orderNo, "Phát hành", "Phát hành");
  await runRowAction(page, "/revenue/orders", "OT-TSK-2026-02-01", "Phát hành", "Phát hành");

  // Create payment and allocate
  await createRecord(page, "/finance/payments", "Tạo phiếu thu", {
    "Mã phiếu thu": "PMT-2026-001",
    "Khách hàng": "Công ty TNHH Thương mại A",
    "Ngày thanh toán": "2026-02-20",
    "Phương thức": "Chuyển khoản",
    "Số tiền": 2200000,
    "Đơn hàng phân bổ": orderNo,
    "Số tiền phân bổ": 2200000,
    "Số tham chiếu": "TRANSFER-A-01",
    "Diễn giải": "Thanh toán phí dịch vụ kế toán tháng 2",
  });

  console.log("=== STEP 14: Create Payroll Period & Inputs ===");
  await createRecord(page, "/payroll/payroll-periods", "Tạo kỳ lương", {
    "Mã kỳ lương": "PAY-2026-02",
    "Từ ngày": "2026-02-01",
    "Đến ngày": "2026-02-28",
    "Trạng thái": "Nháp",
    "Chính sách lương": "Chính sách lương 2026",
    "Chính sách thuế": "Chính sách thuế 2026",
    "Chính sách bảo hiểm": "Chính sách bảo hiểm 2026",
    "Ghi chú": "Tính lương tháng 2/2026",
  });

  // Create payroll inputs
  await createRecord(page, "/payroll/payroll-inputs", "Thêm input", {
    "Kỳ lương": "PAY-2026-02",
    "Nhân viên": "Nguyễn Văn Kế Toán",
    "Ngày công thực tế": 26,
    "Nghỉ không lương": 0,
    "Giờ tăng ca": 0,
    "Doanh số": 0,
    "Doanh số vượt": 0,
    "Doanh số job 1 lần": 5000000,
    "Doanh số khách mới": 0,
    "Tạm ứng": 0,
    "Hoàn ứng": 0,
    "Điều chỉnh chịu thuế": 0,
    "Điều chỉnh miễn thuế": 0,
    "Ghi chú": "Làm đủ công, hưởng hoa hồng job báo cáo tài chính",
  });

  await createRecord(page, "/payroll/payroll-inputs", "Thêm input", {
    "Kỳ lương": "PAY-2026-02",
    "Nhân viên": "Trần Thị Kinh Doanh",
    "Ngày công thực tế": 24,
    "Nghỉ không lương": 2,
    "Giờ tăng ca": 0,
    "Doanh số": 5000000,
    "Doanh số vượt": 2000000,
    "Doanh số job 1 lần": 0,
    "Doanh số khách mới": 2000000,
    "Tạm ứng": 1000000,
    "Hoàn ứng": 0,
    "Điều chỉnh chịu thuế": 0,
    "Điều chỉnh miễn thuế": 0,
    "Ghi chú": "Nghỉ 2 ngày không lương, có hoa hồng doanh số & khách mới",
  });

  await createRecord(page, "/payroll/payroll-inputs", "Thêm input", {
    "Kỳ lương": "PAY-2026-02",
    "Nhân viên": "Phạm Trưởng Phòng",
    "Ngày công thực tế": 26,
    "Nghỉ không lương": 0,
    "Giờ tăng ca": 0,
    "Doanh số": 0,
    "Doanh số vượt": 0,
    "Doanh số job 1 lần": 0,
    "Doanh số khách mới": 0,
    "Tạm ứng": 0,
    "Hoàn ứng": 0,
    "Điều chỉnh chịu thuế": 0,
    "Điều chỉnh miễn thuế": 0,
    "Ghi chú": "Làm đủ công",
  });

  // Calculate and process payroll period
  await runRowAction(page, "/payroll/payroll-periods", "PAY-2026-02", "Tính lương", "Tính");
  await runRowAction(page, "/payroll/payroll-periods", "PAY-2026-02", "Rà soát", "Rà soát");
  await runRowAction(page, "/payroll/payroll-periods", "PAY-2026-02", "Duyệt", "Duyệt");
  await runRowAction(page, "/payroll/payroll-periods", "PAY-2026-02", "Khóa", "Khóa");
  await runRowAction(page, "/payroll/payroll-periods", "PAY-2026-02", "Đã trả", "Đã trả");

  console.log("=== ALL STEPS COMPLETED SUCCESSFULY ===");
});

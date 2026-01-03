/**
 * @jest-environment jsdom
 */

import { screen } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("should alert and reset file input if file extension is invalid", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      const onNavigate = jest.fn();
      const store = { bills: () => ({ create: jest.fn() }) };
      window.alert = jest.fn();
      window.localStorage.clear();
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "employee@test.tld" })
      );
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });
      const fileInput = screen.getByTestId("file");
      const invalidFile = new File(["dummy content"], "test.pdf", {
        type: "application/pdf",
      });

      Object.defineProperty(fileInput, "files", {
        value: [invalidFile],
      });
      const event = {
        preventDefault: jest.fn(),
        target: fileInput,
      };
      newBill.handleChangeFile(event);

      expect(window.alert).toHaveBeenCalledWith(
        "Seuls les fichiers au format .jpg, .jpeg ou .png sont autorisés."
      );
      expect(fileInput.value).toBe("");
    });

    test("should upload file input if file extension is valid", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      const onNavigate = jest.fn();
      const createMock = jest
        .fn()
        .mockResolvedValue({ fileUrl: "url", key: "123" });
      const store = { bills: () => ({ create: createMock }) };
      window.alert = jest.fn();
      window.localStorage.clear();
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "employee@test.tld" })
      );
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });
      const fileInput = screen.getByTestId("file");
      const validFile = new File(["dummy content"], "test.png", {
        type: "image/png",
      });

      Object.defineProperty(fileInput, "files", {
        value: [validFile],
      });
      const event = {
        preventDefault: jest.fn(),
        target: {
          files: [validFile],
          value: "C:\\fakepath\\test.png",
        },
      };
      newBill.handleChangeFile(event);

      expect(window.alert).not.toHaveBeenCalled();
      expect(createMock).toHaveBeenCalled();
    });
  });

  test("should call updateBill and onNavigate with correct bill data on form submit", () => {
    const html = NewBillUI();
    document.body.innerHTML = html;
    const onNavigate = jest.fn();
    const store = { bills: () => ({ create: jest.fn() }) };
    window.localStorage.clear();
    window.localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "employee@test.tld" })
    );
    const newBill = new NewBill({
      document,
      onNavigate,
      store,
      localStorage: window.localStorage,
    });
    newBill.fileUrl = "url";
    newBill.fileName = "test.png";
    newBill.updateBill = jest.fn();

    screen.getByTestId("expense-type").value = "Transports";
    screen.getByTestId("expense-name").value = "Taxi";
    screen.getByTestId("amount").value = "42";
    screen.getByTestId("datepicker").value = "2023-01-01";
    screen.getByTestId("vat").value = "10";
    screen.getByTestId("pct").value = "20";
    screen.getByTestId("commentary").value = "Test";

    const form = screen.getByTestId("form-new-bill");
    form.dispatchEvent(new Event("submit"));

    expect(newBill.updateBill).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "employee@test.tld",
        type: "Transports",
        name: "Taxi",
        amount: 42,
        date: "2023-01-01",
        vat: "10",
        pct: 20,
        commentary: "Test",
        fileUrl: "url",
        fileName: "test.png",
        status: "pending",
      })
    );
    expect(onNavigate).toHaveBeenCalledWith("#employee/bills");
    expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
  });

  test("should handle error in handleChangeFile (catch branch)", async () => {
    const html = NewBillUI();
    document.body.innerHTML = html;
    const onNavigate = jest.fn();
    const createMock = jest
      .fn()
      .mockRejectedValueOnce(new Error("create error"));
    const store = { bills: () => ({ create: createMock }) };
    window.localStorage.clear();
    window.localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "employee@test.tld" })
    );
    const newBill = new NewBill({
      document,
      onNavigate,
      store,
      localStorage: window.localStorage,
    });
    const fileInput = screen.getByTestId("file");
    const validFile = new File(["dummy content"], "test.png", {
      type: "image/png",
    });

    Object.defineProperty(fileInput, "files", {
      value: [validFile],
    });
    const event = {
      preventDefault: jest.fn(),
      target: {
        files: [validFile],
        value: "C:\\fakepath\\test.png",
      },
    };
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    newBill.handleChangeFile(event);
    await new Promise((r) => setTimeout(r, 10));
    expect(createMock).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    errorSpy.mockRestore();
  });
});

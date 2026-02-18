/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import userEvent from "@testing-library/user-event";
import mockStore from "../__mocks__/store";

jest.mock("../app/store", () => mockStore);

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        }),
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i,
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });

  describe("When I click on the icon eye", () => {
    test("A modal should open", () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        }),
      );

      window.$ = jest.fn(() => ({
        width: () => 1000,
        find: () => ({
          html: jest.fn(),
        }),
        modal: jest.fn(),
        click: jest.fn(),
      }));

      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const store = null;
      const billsInstance = new Bills({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const spy = jest.spyOn(billsInstance, "handleClickIconEye");
      const eyes = screen.getAllByTestId("icon-eye");
      const eye = eyes[0];
      userEvent.click(eye);
      expect(spy).toHaveBeenCalled();

      const modale = screen.getByTestId("modaleFile");
      expect(modale).toBeTruthy();
    });
  });

  describe("When I click on new bill button", () => {
    test("I should navigate to NewBill page", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = jest.fn();
      const billsInstance = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });
      const btn = screen.getByTestId("btn-new-bill");
      btn.click();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });
  });

  // test d'intégration GET
  describe("Given I am a user connected as Employee", () => {
    describe("When I navigate to Bills", () => {
      test("fetches bills from mock API GET", async () => {
        localStorage.setItem(
          "user",
          JSON.stringify({ type: "Employee", email: "a@a" }),
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH.Bills);
        await waitFor(() => screen.getByText("Mes notes de frais"));
        const contentPending = await screen.getByText("Nouvelle note de frais");
        expect(contentPending).toBeTruthy();
        expect(screen.getAllByTestId("icon-eye").length).toBeGreaterThan(0);
      });

      test("should return unformatted date if formatDate throws", async () => {
        const faultyBills = [{ ...bills[0], date: "invalid-date" }];
        jest
          .spyOn(require("../app/format.js"), "formatDate")
          .mockImplementation(() => {
            throw new Error("Invalid date");
          });

        const store = {
          bills: () => ({
            list: () => Promise.resolve(faultyBills),
          }),
        };
        const billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store,
          localStorage: window.localStorage,
        });
        const result = await billsInstance.getBills();
        expect(result[0].date).toBe("invalid-date");
        require("../app/format.js").formatDate.mockRestore();
      });

      test("getBills returns undefined if store is null", async () => {
        const billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store: null,
          localStorage: window.localStorage,
        });
        const result = await billsInstance.getBills();
        expect(result).toBeUndefined();
      });

      describe("When an error occurs on API", () => {
        beforeEach(() => {
          jest.spyOn(mockStore, "bills");
          Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
          });
          window.localStorage.setItem(
            "user",
            JSON.stringify({
              type: "Employee",
              email: "a@a",
            }),
          );
          const root = document.createElement("div");
          root.setAttribute("id", "root");
          document.body.appendChild(root);
          router();
        });
        test("fetches bills from an API and fails with 404 message error", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(new Error("Erreur 404"));
              },
            };
          });
          window.onNavigate(ROUTES_PATH.Bills);
          await waitFor(() => {
            expect(screen.getByText(/Erreur 404/)).toBeTruthy();
          });
        });

        test("fetches messages from an API and fails with 500 message error", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(new Error("Erreur 500"));
              },
            };
          });

          window.onNavigate(ROUTES_PATH.Bills);
          await waitFor(() => {
            expect(screen.getByText(/Erreur 500/)).toBeTruthy();
          });
        });
      });
    });
  });
});

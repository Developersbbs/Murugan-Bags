import { ReadonlyURLSearchParams } from "next/navigation";

type ParamsResponse = {
  page?: number;
  limit?: number;
  search?: string;
  price?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  subcategory?: string;
  status?: string;
  method?: string;
  role?: string;
  published?: boolean;
  productType?: string;
  productId?: string;
  variantId?: string;
  location?: string;
  lowStock?: boolean;
};

export const getSearchParams = (
  searchParams: ReadonlyURLSearchParams
): ParamsResponse => {
  const getDropdownParam = (param: string) => {
    return searchParams.get(param) === "all"
      ? undefined
      : searchParams.get(param) || undefined;
  };

  const getBooleanParam = (param: string) => {
    return searchParams.get(param) === "true"
      ? true
      : searchParams.get(param) === "false"
      ? false
      : undefined;
  };

  const page =
    searchParams.get("page") && !isNaN(Number(searchParams.get("page")))
      ? Math.max(1, Math.trunc(Number(searchParams.get("page"))))
      : 1;
  const limit = Math.trunc(Number(searchParams.get("limit"))) || 10;

  const search = searchParams.get("search") || undefined;
  const price = searchParams.get("price") || undefined;
  const date = searchParams.get("date") || undefined;
  const startDate = searchParams.get("start-date") || undefined;
  const endDate = searchParams.get("end-date") || undefined;

  const category = getDropdownParam("category");
  const subcategory = getDropdownParam("subcategory");
  const status = getDropdownParam("status");
  const method = getDropdownParam("method");
  const role = getDropdownParam("role");
  const published = getBooleanParam("published");
  const productType = getDropdownParam("productType");
  const productId = getDropdownParam("productId");
  const variantId = getDropdownParam("variantId");
  const location = getDropdownParam("location");
  const lowStock = getBooleanParam("lowStock");

  return {
    page,
    limit,
    search,
    price,
    date,
    startDate,
    endDate,
    category,
    subcategory,
    status,
    method,
    role,
    published,
    productType,
    productId,
    variantId,
    location,
    lowStock,
  };
};

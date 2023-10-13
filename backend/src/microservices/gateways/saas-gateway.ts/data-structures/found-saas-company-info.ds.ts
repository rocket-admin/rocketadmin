export class CompanyAddressRO {
  id: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserInfoRO {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  email: string;
}

export class FoundSassCompanyInfoDS {
  id: string;
  additional_info: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users: UserInfoRO[];
  address: CompanyAddressRO;
}

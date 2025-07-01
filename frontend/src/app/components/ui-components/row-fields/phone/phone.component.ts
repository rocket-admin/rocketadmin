import { Component, Injectable, Input, OnInit } from '@angular/core';
import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

@Injectable()

@Component({
  selector: 'app-row-phone',
  templateUrl: './phone.component.html',
  styleUrls: ['./phone.component.css'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule]
})
export class PhoneRowComponent extends BaseRowFieldComponent implements OnInit {
  @Input() value: string = '';

  static type = 'phone';

  preferredCountries: string[] = ['US', 'GB'];
  enablePlaceholder: boolean = true;
  enableAutoCountrySelect: boolean = true;
  phoneValidation: boolean = true;

  selectedCountry: CountryCode;
  phoneNumber: string = '';
  
  countries: CountryCode[] = [
    { code: 'AF', name: 'Afghanistan', dialCode: '+93', flag: '🇦🇫' },
    { code: 'AL', name: 'Albania', dialCode: '+355', flag: '🇦🇱' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
    { code: 'AS', name: 'American Samoa', dialCode: '+1684', flag: '🇦🇸' },
    { code: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩' },
    { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
    { code: 'AI', name: 'Anguilla', dialCode: '+1264', flag: '🇦🇮' },
    { code: 'AQ', name: 'Antarctica', dialCode: '+672', flag: '🇦🇶' },
    { code: 'AG', name: 'Antigua and Barbuda', dialCode: '+1268', flag: '🇦🇬' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
    { code: 'AM', name: 'Armenia', dialCode: '+374', flag: '🇦🇲' },
    { code: 'AW', name: 'Aruba', dialCode: '+297', flag: '🇦🇼' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
    { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
    { code: 'AZ', name: 'Azerbaijan', dialCode: '+994', flag: '🇦🇿' },
    { code: 'BS', name: 'Bahamas', dialCode: '+1242', flag: '🇧🇸' },
    { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
    { code: 'BB', name: 'Barbados', dialCode: '+1246', flag: '🇧🇧' },
    { code: 'BY', name: 'Belarus', dialCode: '+375', flag: '🇧🇾' },
    { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
    { code: 'BZ', name: 'Belize', dialCode: '+501', flag: '🇧🇿' },
    { code: 'BJ', name: 'Benin', dialCode: '+229', flag: '🇧🇯' },
    { code: 'BM', name: 'Bermuda', dialCode: '+1441', flag: '🇧🇲' },
    { code: 'BT', name: 'Bhutan', dialCode: '+975', flag: '🇧🇹' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴' },
    { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387', flag: '🇧🇦' },
    { code: 'BW', name: 'Botswana', dialCode: '+267', flag: '🇧🇼' },
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'IO', name: 'British Indian Ocean Territory', dialCode: '+246', flag: '🇮🇴' },
    { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
    { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬' },
    { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
    { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
    { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
    { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'CV', name: 'Cape Verde', dialCode: '+238', flag: '🇨🇻' },
    { code: 'KY', name: 'Cayman Islands', dialCode: '+1345', flag: '🇰🇾' },
    { code: 'CF', name: 'Central African Republic', dialCode: '+236', flag: '🇨🇫' },
    { code: 'TD', name: 'Chad', dialCode: '+235', flag: '🇹🇩' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
    { code: 'CX', name: 'Christmas Island', dialCode: '+61', flag: '🇨🇽' },
    { code: 'CC', name: 'Cocos Islands', dialCode: '+61', flag: '🇨🇨' },
    { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
    { code: 'KM', name: 'Comoros', dialCode: '+269', flag: '🇰🇲' },
    { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
    { code: 'CD', name: 'Congo (DRC)', dialCode: '+243', flag: '🇨🇩' },
    { code: 'CK', name: 'Cook Islands', dialCode: '+682', flag: '🇨🇰' },
    { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
    { code: 'CI', name: 'Côte d\'Ivoire', dialCode: '+225', flag: '🇨🇮' },
    { code: 'HR', name: 'Croatia', dialCode: '+385', flag: '🇭🇷' },
    { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
    { code: 'CW', name: 'Curaçao', dialCode: '+599', flag: '🇨🇼' },
    { code: 'CY', name: 'Cyprus', dialCode: '+357', flag: '🇨🇾' },
    { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
    { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
    { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯' },
    { code: 'DM', name: 'Dominica', dialCode: '+1767', flag: '🇩🇲' },
    { code: 'DO', name: 'Dominican Republic', dialCode: '+1', flag: '🇩🇴' },
    { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
    { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
    { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
    { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240', flag: '🇬🇶' },
    { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷' },
    { code: 'EE', name: 'Estonia', dialCode: '+372', flag: '🇪🇪' },
    { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
    { code: 'FK', name: 'Falkland Islands', dialCode: '+500', flag: '🇫🇰' },
    { code: 'FO', name: 'Faroe Islands', dialCode: '+298', flag: '🇫🇴' },
    { code: 'FJ', name: 'Fiji', dialCode: '+679', flag: '🇫🇯' },
    { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'GF', name: 'French Guiana', dialCode: '+594', flag: '🇬🇫' },
    { code: 'PF', name: 'French Polynesia', dialCode: '+689', flag: '🇵🇫' },
    { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
    { code: 'GM', name: 'Gambia', dialCode: '+220', flag: '🇬🇲' },
    { code: 'GE', name: 'Georgia', dialCode: '+995', flag: '🇬🇪' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
    { code: 'GI', name: 'Gibraltar', dialCode: '+350', flag: '🇬🇮' },
    { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
    { code: 'GL', name: 'Greenland', dialCode: '+299', flag: '🇬🇱' },
    { code: 'GD', name: 'Grenada', dialCode: '+1473', flag: '🇬🇩' },
    { code: 'GP', name: 'Guadeloupe', dialCode: '+590', flag: '🇬🇵' },
    { code: 'GU', name: 'Guam', dialCode: '+1671', flag: '🇬🇺' },
    { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
    { code: 'GG', name: 'Guernsey', dialCode: '+44', flag: '🇬🇬' },
    { code: 'GN', name: 'Guinea', dialCode: '+224', flag: '🇬🇳' },
    { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245', flag: '🇬🇼' },
    { code: 'GY', name: 'Guyana', dialCode: '+592', flag: '🇬🇾' },
    { code: 'HT', name: 'Haiti', dialCode: '+509', flag: '🇭🇹' },
    { code: 'VA', name: 'Holy See', dialCode: '+379', flag: '🇻🇦' },
    { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
    { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
    { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺' },
    { code: 'IS', name: 'Iceland', dialCode: '+354', flag: '🇮🇸' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
    { code: 'IR', name: 'Iran', dialCode: '+98', flag: '🇮🇷' },
    { code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
    { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
    { code: 'IM', name: 'Isle of Man', dialCode: '+44', flag: '🇮🇲' },
    { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
    { code: 'JM', name: 'Jamaica', dialCode: '+1876', flag: '🇯🇲' },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
    { code: 'JE', name: 'Jersey', dialCode: '+44', flag: '🇯🇪' },
    { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
    { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿' },
    { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
    { code: 'KI', name: 'Kiribati', dialCode: '+686', flag: '🇰🇮' },
    { code: 'KP', name: 'North Korea', dialCode: '+850', flag: '🇰🇵' },
    { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
    { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996', flag: '🇰🇬' },
    { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
    { code: 'LV', name: 'Latvia', dialCode: '+371', flag: '🇱🇻' },
    { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
    { code: 'LS', name: 'Lesotho', dialCode: '+266', flag: '🇱🇸' },
    { code: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
    { code: 'LY', name: 'Libya', dialCode: '+218', flag: '🇱🇾' },
    { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
    { code: 'LT', name: 'Lithuania', dialCode: '+370', flag: '🇱🇹' },
    { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
    { code: 'MO', name: 'Macau', dialCode: '+853', flag: '🇲🇴' },
    { code: 'MK', name: 'North Macedonia', dialCode: '+389', flag: '🇲🇰' },
    { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
    { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
    { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻' },
    { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
    { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹' },
    { code: 'MH', name: 'Marshall Islands', dialCode: '+692', flag: '🇲🇭' },
    { code: 'MQ', name: 'Martinique', dialCode: '+596', flag: '🇲🇶' },
    { code: 'MR', name: 'Mauritania', dialCode: '+222', flag: '🇲🇷' },
    { code: 'MU', name: 'Mauritius', dialCode: '+230', flag: '🇲🇺' },
    { code: 'YT', name: 'Mayotte', dialCode: '+262', flag: '🇾🇹' },
    { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
    { code: 'FM', name: 'Micronesia', dialCode: '+691', flag: '🇫🇲' },
    { code: 'MD', name: 'Moldova', dialCode: '+373', flag: '🇲🇩' },
    { code: 'MC', name: 'Monaco', dialCode: '+377', flag: '🇲🇨' },
    { code: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳' },
    { code: 'ME', name: 'Montenegro', dialCode: '+382', flag: '🇲🇪' },
    { code: 'MS', name: 'Montserrat', dialCode: '+1664', flag: '🇲🇸' },
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
    { code: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿' },
    { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
    { code: 'NA', name: 'Namibia', dialCode: '+264', flag: '🇳🇦' },
    { code: 'NR', name: 'Nauru', dialCode: '+674', flag: '🇳🇷' },
    { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
    { code: 'NC', name: 'New Caledonia', dialCode: '+687', flag: '🇳🇨' },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
    { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
    { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
    { code: 'NU', name: 'Niue', dialCode: '+683', flag: '🇳🇺' },
    { code: 'NF', name: 'Norfolk Island', dialCode: '+672', flag: '🇳🇫' },
    { code: 'MP', name: 'Northern Mariana Islands', dialCode: '+1670', flag: '🇲🇵' },
    { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
    { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
    { code: 'PW', name: 'Palau', dialCode: '+680', flag: '🇵🇼' },
    { code: 'PS', name: 'Palestine', dialCode: '+970', flag: '🇵🇸' },
    { code: 'PA', name: 'Panama', dialCode: '+507', flag: '🇵🇦' },
    { code: 'PG', name: 'Papua New Guinea', dialCode: '+675', flag: '🇵🇬' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾' },
    { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
    { code: 'PN', name: 'Pitcairn Islands', dialCode: '+64', flag: '🇵🇳' },
    { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
    { code: 'PR', name: 'Puerto Rico', dialCode: '+1787', flag: '🇵🇷' },
    { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
    { code: 'RE', name: 'Réunion', dialCode: '+262', flag: '🇷🇪' },
    { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴' },
    { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
    { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
    { code: 'BL', name: 'Saint Barthélemy', dialCode: '+590', flag: '🇧🇱' },
    { code: 'SH', name: 'Saint Helena', dialCode: '+290', flag: '🇸🇭' },
    { code: 'KN', name: 'Saint Kitts and Nevis', dialCode: '+1869', flag: '🇰🇳' },
    { code: 'LC', name: 'Saint Lucia', dialCode: '+1758', flag: '🇱🇨' },
    { code: 'MF', name: 'Saint Martin', dialCode: '+590', flag: '🇲🇫' },
    { code: 'PM', name: 'Saint Pierre and Miquelon', dialCode: '+508', flag: '🇵🇲' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', dialCode: '+1784', flag: '🇻🇨' },
    { code: 'WS', name: 'Samoa', dialCode: '+685', flag: '🇼🇸' },
    { code: 'SM', name: 'San Marino', dialCode: '+378', flag: '🇸🇲' },
    { code: 'ST', name: 'São Tomé and Príncipe', dialCode: '+239', flag: '🇸🇹' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
    { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
    { code: 'RS', name: 'Serbia', dialCode: '+381', flag: '🇷🇸' },
    { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨' },
    { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
    { code: 'SX', name: 'Sint Maarten', dialCode: '+1721', flag: '🇸🇽' },
    { code: 'SK', name: 'Slovakia', dialCode: '+421', flag: '🇸🇰' },
    { code: 'SI', name: 'Slovenia', dialCode: '+386', flag: '🇸🇮' },
    { code: 'SB', name: 'Solomon Islands', dialCode: '+677', flag: '🇸🇧' },
    { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴' },
    { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
    { code: 'GS', name: 'South Georgia and the South Sandwich Islands', dialCode: '+500', flag: '🇬🇸' },
    { code: 'SS', name: 'South Sudan', dialCode: '+211', flag: '🇸🇸' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
    { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩' },
    { code: 'SR', name: 'Suriname', dialCode: '+597', flag: '🇸🇷' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen', dialCode: '+47', flag: '🇸🇯' },
    { code: 'SZ', name: 'Eswatini', dialCode: '+268', flag: '🇸🇿' },
    { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
    { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
    { code: 'SY', name: 'Syria', dialCode: '+963', flag: '🇸🇾' },
    { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
    { code: 'TJ', name: 'Tajikistan', dialCode: '+992', flag: '🇹🇯' },
    { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
    { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
    { code: 'TL', name: 'Timor-Leste', dialCode: '+670', flag: '🇹🇱' },
    { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
    { code: 'TK', name: 'Tokelau', dialCode: '+690', flag: '🇹🇰' },
    { code: 'TO', name: 'Tonga', dialCode: '+676', flag: '🇹🇴' },
    { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1868', flag: '🇹🇹' },
    { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
    { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
    { code: 'TM', name: 'Turkmenistan', dialCode: '+993', flag: '🇹🇲' },
    { code: 'TC', name: 'Turks and Caicos Islands', dialCode: '+1649', flag: '🇹🇨' },
    { code: 'TV', name: 'Tuvalu', dialCode: '+688', flag: '🇹🇻' },
    { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
    { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'UM', name: 'United States Minor Outlying Islands', dialCode: '+1', flag: '🇺🇲' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
    { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿' },
    { code: 'VU', name: 'Vanuatu', dialCode: '+678', flag: '🇻🇺' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
    { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
    { code: 'VG', name: 'British Virgin Islands', dialCode: '+1284', flag: '🇻🇬' },
    { code: 'VI', name: 'U.S. Virgin Islands', dialCode: '+1340', flag: '🇻🇮' },
    { code: 'WF', name: 'Wallis and Futuna', dialCode: '+681', flag: '🇼🇫' },
    { code: 'EH', name: 'Western Sahara', dialCode: '+212', flag: '🇪🇭' },
    { code: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
    { code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' }
  ];

  ngOnInit(): void {
    super.ngOnInit();
    this.configureFromWidgetParams();
    this.initializePhoneNumber();
  }

  private configureFromWidgetParams(): void {
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      const params = this.widgetStructure.widget_params;
      
      if (params.preferred_countries && Array.isArray(params.preferred_countries)) {
        this.preferredCountries = params.preferred_countries;
      }
      
      if (typeof params.enable_placeholder === 'boolean') {
        this.enablePlaceholder = params.enable_placeholder;
      }
      
      if (typeof params.enable_auto_country_select === 'boolean') {
        this.enableAutoCountrySelect = params.enable_auto_country_select;
      }
      
      if (typeof params.phone_validation === 'boolean') {
        this.phoneValidation = params.phone_validation;
      }
    }
  }

  private initializePhoneNumber(): void {
    if (this.value) {
      this.parseExistingPhoneNumber(this.value);
    } else {
      // Set default country
      this.selectedCountry = this.countries.find(c => c.code === this.preferredCountries[0]) || this.countries[0];
    }
  }

  private parseExistingPhoneNumber(fullNumber: string): void {
    // Clean the number first (remove spaces, dashes, parentheses)
    const cleanNumber = fullNumber.replace(/[\s\-\(\)]/g, '');
    
    // Try to extract country code from existing number
    // Sort countries by dial code length (longest first) to match correctly
    const sortedByDialCode = this.countries.sort((a, b) => b.dialCode.length - a.dialCode.length);
    
    const country = sortedByDialCode.find(c => {
      const cleanDialCode = c.dialCode.replace('+', '');
      return cleanNumber.startsWith('+' + cleanDialCode) || cleanNumber.startsWith(cleanDialCode);
    });
    
    if (country) {
      this.selectedCountry = country;
      const cleanDialCode = country.dialCode.replace('+', '');
      let remainingNumber = cleanNumber;
      
      // Remove the country code from the beginning
      if (remainingNumber.startsWith('+' + cleanDialCode)) {
        remainingNumber = remainingNumber.substring(cleanDialCode.length + 1);
      } else if (remainingNumber.startsWith(cleanDialCode)) {
        remainingNumber = remainingNumber.substring(cleanDialCode.length);
      }
      
      this.phoneNumber = remainingNumber;
    } else {
      // Default to first preferred country
      this.selectedCountry = this.countries.find(c => c.code === this.preferredCountries[0]) || this.countries[0];
      this.phoneNumber = fullNumber;
    }
  }

  onCountryChange(): void {
    this.updateFullPhoneNumber();
  }

  onPhoneNumberChange(): void {
    // Check if user entered a full international number (starts with +)
    if (this.phoneNumber.startsWith('+')) {
      this.detectCountryFromInput();
    } else {
      this.updateFullPhoneNumber();
    }
  }

  private detectCountryFromInput(): void {
    if (!this.phoneNumber.startsWith('+')) {
      return;
    }

    // Clean the number (remove spaces, dashes, parentheses)
    const cleanNumber = this.phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Sort countries by dial code length (longest first) to match correctly
    const sortedByDialCode = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
    
    const detectedCountry = sortedByDialCode.find(c => {
      return cleanNumber.startsWith(c.dialCode);
    });
    
    if (detectedCountry) {
      // Update selected country
      this.selectedCountry = detectedCountry;
      
      // Extract the remaining phone number (without country code)
      const remainingNumber = cleanNumber.substring(detectedCountry.dialCode.length);
      
      // Update the phone number field to show only the local part
      this.phoneNumber = remainingNumber;
      
      // Update the full value
      this.updateFullPhoneNumber();
    } else {
      // If no country detected, treat as full number
      this.updateFullPhoneNumber();
    }
  }

  private updateFullPhoneNumber(): void {
    if (this.phoneNumber.startsWith('+')) {
      // If user entered a full international number, use it as-is
      this.value = this.phoneNumber;
    } else if (this.selectedCountry && this.phoneNumber) {
      // Combine country code with local number
      this.value = `${this.selectedCountry.dialCode} ${this.phoneNumber}`;
    } else if (this.phoneNumber) {
      // Just the number without country code
      this.value = this.phoneNumber;
    } else {
      this.value = '';
    }
    this.onFieldChange.emit(this.value);
  }

  get sortedCountries(): CountryCode[] {
    const preferred = this.countries.filter(c => this.preferredCountries.includes(c.code));
    const others = this.countries.filter(c => !this.preferredCountries.includes(c.code));
    return [...preferred, ...others];
  }

  get placeholder(): string {
    if (!this.enablePlaceholder) return '';
    return this.selectedCountry ? `Phone number for ${this.selectedCountry.name}` : 'Phone number';
  }

  getPhoneNumberPlaceholder(): string {
    if (!this.enablePlaceholder) return '';
    if (this.selectedCountry) {
      return `Local number or ${this.selectedCountry.dialCode}1234567890`;
    }
    return 'Enter +1234567890 or select country';
  }

  isValidPhoneNumber(): boolean {
    if (!this.phoneValidation) return true;
    if (!this.phoneNumber) return true; // Empty is valid (let required validation handle it)
    
    // If it's an international number (starts with +), validate differently
    if (this.phoneNumber.startsWith('+')) {
      const phoneRegex = /^\+[\d\s\-\(\)]+$/;
      const cleanNumber = this.phoneNumber.replace(/\D/g, '');
      return phoneRegex.test(this.phoneNumber) && cleanNumber.length >= 8; // At least country code + 7 digits
    } else {
      // Local number validation - digits, spaces, dashes, parentheses
      const phoneRegex = /^[\d\s\-\(\)]+$/;
      return phoneRegex.test(this.phoneNumber) && this.phoneNumber.replace(/\D/g, '').length >= 7;
    }
  }
}
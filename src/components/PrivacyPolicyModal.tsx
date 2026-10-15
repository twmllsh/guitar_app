import React from 'react';
import { X, ShieldCheck, Mail, Info, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">개인정보처리방침 및 서비스 안내</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-zinc-300 leading-relaxed scrollbar-thin">
          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400" />
              1. 서비스 개요
            </h4>
            <p>
              <strong>Guitar Chord Note</strong>(이하 "본 사이트")는 기타 연주자들을 위해 ChordPro 기반의 코드 악보 열람, 실시간 조옮김, 카포 운지 안내, 자동 스크롤 연주 편의 기능을 제공하는 무료 웹 애플리케이션입니다.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              2. 개인정보 수집 및 저장 안내
            </h4>
            <p>
              본 사이트는 일반 방문자로부터 주민등록번호, 연락처 등의 민감한 개인정보를 서버 데이터베이스에 수집하거나 저장하지 않습니다.
            </p>
            <p>
              사용자가 추가하거나 수정한 악보 데이터, 폰트 크기 및 자동 스크롤 설정값은 전적으로 방문자 본인의 웹 브라우저 로컬 저장소(LocalStorage)에만 안전하게 보관되며, 언제든지 브라우저 캐시 삭제 또는 사이트 내 백업 파일 관리를 통해 삭제할 수 있습니다.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              3. 쿠키(Cookie) 및 제3자 광고 사업자(Google AdSense) 안내
            </h4>
            <p>
              본 사이트는 무료 서비스 운영 및 지속적인 기능 개선을 위해 제3자 광고 서비스(예: Google AdSense 등)를 이용할 수 있습니다.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-zinc-400">
              <li>
                Google을 포함한 제3자 공급업체는 쿠키를 사용하여 사용자가 본 사이트 또는 다른 웹사이트를 과거에 방문한 기록을 바탕으로 광고를 게재합니다.
              </li>
              <li>
                광고 쿠키를 사용하면 Google과 그 파트너는 사용자의 본 사이트 및 인터넷의 다른 사이트 방문 기록을 기반으로 적절한 맞춤형 광고를 제공할 수 있습니다.
              </li>
              <li>
                사용자는 <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Google 광고 설정</a>을 방문하여 개인 맞춤 광고를 사용 중지할 수 있습니다.
              </li>
              <li>
                또한 <a href="https://www.aboutads.info" target="_blank" rel="noreferrer" className="text-emerald-400 underline">www.aboutads.info</a>를 방문하여 맞춤형 광고에 사용되는 제3자 공급업체의 쿠키 사용을 거부할 수 있습니다.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-400" />
              4. 문의처 및 피드백
            </h4>
            <p>
              본 서비스 이용 문의, 악보 저작권 관련 요청, 제휴 및 버그 제보는 아래 연락처로 문의해 주시면 신속하게 조치하겠습니다.
            </p>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1 text-zinc-400">
              <p>• 서비스명: Guitar Chord Note (guitar.ponytail.kr)</p>
              <p>• 관리자 이메일: <a href="mailto:twmllsh@gmail.com" className="text-emerald-400 underline">twmllsh@gmail.com</a></p>
              <p>• 시행일자: 2026년 10월 15일</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

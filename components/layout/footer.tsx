import Container from "@/common/container";
import { Github, Globe, Twitter } from "lucide-react";


const Footer = () => {
  return (
    <Container>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between border-b pb-2 px-3 border-neutral-200/60">
          <span className="flex flex-col justify-start gap-2">
            <span className="text-xl font-semibold tracking-tight text-neutral-900">
              ProductTrack
            </span>
            <p className="text-xs text-neutral-600 max-w-50 leading-tight pl-0.5">
              Track prices from all major e-commerce sites and save money.
            </p>
          </span>
          <span className="flex flex-col gap-1">
            <h1 className="text-neutral-500 text-lg">Follow on</h1>
            <span className="flex items-center gap-3">
              <a href="https://github.com/Vivekanandareddy7">
                <Github
                  size={16}
                  className="text-neutral-500 hover:text-neutral-800 duration-200 transition-all"
                />
              </a>
              <a href="https://github.com/Vivekanandareddy7">
                <Globe
                  size={16}
                  className="text-neutral-500 hover:text-neutral-800 duration-200 transition-all"
                />
              </a>
              <a href="https://github.com/Vivekanandareddy7">
                <Twitter
                  size={16}
                  className="text-neutral-500 hover:text-neutral-800 duration-200 transition-all"
                />
              </a>
            </span>
          </span>
        </div>
        <div className="lg:mask-b-from-40% flex items-center">
          <div className="flex items-center justify-center pt-10 w-full">
            <h2 className="bg-linear-to-t from-neutral-100 text-center via-neutral-200 to-neutral-300 bg-clip-text text-6xl font-bold text-transparent md:text-[180px]">
              ProductTrack.
            </h2>
          </div>
        </div>
        <div className="flex justify-between items-start h-10 pt-3 mb-5 bg-neutral-50 px-3">
          <div>
            <span className="text-xs text-neutral-500 flex gap-1">
              <p className="text-neutral-700"> © 2026 </p>
              ProductTrack. All rights reserved.
            </span>
          </div>
          <div>
            <p className="text-xs text-neutral-400">
              Made by{" "}
              <a
                href="https://github.com/Vivekanandareddy7"
                className="text-neutral-600 hover:text-neutral-800 duration-200 transition-all"
              >
                VivekanandaReddy
              </a>
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Footer;

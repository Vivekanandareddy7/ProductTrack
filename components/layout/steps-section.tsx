"use client";
import Container from "@/common/container";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ClipboardPaste,
  Copy,
  Text,
  TrendingDown,
  Mail,
  CheckCircle,
  ArrowRight,
  Search,
} from "lucide-react";
import Image from "next/image";
import TrackerPriceChart from "@/components/tracker-price-chart";

const stepsData = [
  {
    id: 1,
    title: "Copy and Paste",
    description: "Copy product URL from any  site",
    animation: "copy",
  },
  {
    id: 2,
    title: "Track Prices",
    description: "We monitor prices 24/7 for you",
    animation: "price",
  },
  {
    id: 3,
    title: "Get Alerts",
    description: "Receive  alert when prices drop",
    animation: "alert",
  },
];

const Steps = () => {
  return (
    <Container className="flex items-center justify-center gap-10 flex-col">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-3xl md:text-4xl max-w-sm text-center font-medium capitalize leading-tighter tracking-tight">
          Start Tracking Prices in 3 Easy Steps
        </h2>
        <p className="text-sm text-neutral-600 text-center max-w-xs">
          Copy any product link, we will monitor the price and notify you when
          it drops.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-x-10 md:gap-10">
        {stepsData.map((step) => (
          <div
            key={step.id}
            className="bg-white p-2 rounded-2xl shadow-md border-transparent border ring ring-neutral-200 mt-5 md:mt-0"
          >
            <div className="bg-neutral-100/70 min-h-50 max-w-60 w-60 rounded-xl py-6 px-8 border  ">
              <div>
                {step.animation === "copy" && <CopyAnimation />}
                {step.animation === "price" && <DownPriceAnimation />}
                {step.animation === "alert" && <EmailAnimation />}
              </div>
            </div>
            <div className="px-4 py-2">
              <h2 className="text-sm">{step.title}</h2>
              <p className="text-xs text-neutral-500 whitespace-nowrap">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default Steps;

const copySteps = [
  { label: "Copy URL", icon: <Copy size={14} /> },
  { label: "Paste URL", icon: <ClipboardPaste size={14} /> },
  { label: "Track It", icon: <Search size={14} /> },
];

const CopyAnimation = () => {
  return (
    <div className="flex flex-col gap-3 justify-center h-full w-full ">
      {copySteps.map((step, index) => (
        <motion.div
          initial={{ y: 12, filter: "blur(4px)", opacity: 0 }}
          animate={{
            y: [12, 0, 0, 0],
            filter: ["blur(4px)", "blur(0px)", "blur(0px)", "blur(4px)"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 5,
            times: [0, 0.12, 0.82, 0.96],
            repeat: Infinity,
            delay: index * 0.65,
            ease: "easeOut",
          }}
          key={index}
          className="bg-white flex justify-between items-center px-3 py-2 rounded-2xl shadow-xs border border-neutral-300/70 active:scale-95 transition-all duration-200  "
        >
          <p className="text-sm">{step.label}</p>
          <span>{step.icon}</span>
        </motion.div>
      ))}
    </div>
  );
};

const demoPrices = [1520, 1480, 1495, 1450, 1430, 1415, 1399];

const DownPriceAnimation = () => {
  const [history] = useState(() => {
    const now = Date.now();
    return demoPrices.map((price, i) => ({
      price,
      checked_at: new Date(
        now - (demoPrices.length - 1 - i) * 86400000,
      ).toISOString(),
    }));
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex w-full flex-col justify-center gap-1"
    >
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-xl font-semibold tabular-nums text-neutral-900">
          ₹1,399
        </span>
        <span className="text-xs font-medium tabular-nums text-emerald-700">
          ↓ 7.9%
        </span>
      </div>
      <TrackerPriceChart history={history} currency="INR" compact />
    </motion.div>
  );
};

const notifications = [
  { id: 1, name: "Price Alert", message: "Price dropped to ₹1,399 on Amazon" },
  { id: 2, name: "Flash Sale", message: "Flat 50% off on top brands today" },
  { id: 3, name: "Deal Alert", message: "Limited time offer ends tonight" },
  {
    id: 4,
    name: "Back in Stock",
    message: "Redragon Kumara K552 is available",
  },
  {
    id: 5,
    name: "Target Reached",
    message: "Your target of ₹1,499 has been reached",
  },
  {
    id: 6,
    name: "Price Drop",
    message: "boAt Airdopes 141 down 12% today",
  },
];

const arrivalOrder = [...notifications].reverse();

const EmailAnimation = () => {
  // Arrival order: oldest lands first, newest drops in on top of it —
  // like phone notifications. Final stack reads Price → Flash → Deal → …
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => alive && fn(), ms));
    };
    const loop = () => {
      if (!alive) return;
      setCount(1);
      arrivalOrder.slice(1).forEach((_, i) => {
        later(() => setCount(i + 2), (i + 1) * 750);
      });
      const fullAt = arrivalOrder.length * 750;
      later(() => setCount(0), fullAt + 2600);
      later(loop, fullAt + 3400);
    };
    loop();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex h-[164px] flex-col items-stretch justify-start gap-2 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <AnimatePresence initial={false}>
        {arrivalOrder
          .slice(0, count)
          .reverse()
          .map((email) => (
            <motion.div
              layout
              initial={{ y: -28, opacity: 0, filter: "blur(4px)", scale: 0.96 }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(4px)", scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              key={email.id}
              className="flex items-center justify-between gap-3 bg-white px-3 py-1 rounded-lg border border-neutral-200 shadow-xs"
            >
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/1280px-Gmail_icon_%282020%29.svg.png"
                alt="gmail"
                height={400}
                width={1500}
                className="h-5 w-7 shrink-0"
              />
              <div className="flex-1 min-w-0 border-l pl-2">
                <h3 className="text-sm text-neutral-800 truncate">
                  {email.name}
                </h3>
                <p className="text-xs text-neutral-500 truncate">
                  {email.message}
                </p>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
};
